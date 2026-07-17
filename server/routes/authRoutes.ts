import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { auditAuthEvent, getAuthorizationContext } from '../authorization.js';
import { syncLicenseFromSubscription, syncUsage } from '../entitlementService.js';
import { requireEntitlement, requireLimit, requireOperationalLicense } from '../middleware/entitlements.js';
import { str } from '../requestUtils.js';
import { mapOrganisation } from '../rowMappers.js';
import { supabaseAdmin, supabaseAuth } from '../supabaseClients.js';

const isStrongPassword = (value: unknown): value is string => typeof value === 'string'
  && value.length >= 10
  && /[A-Za-z]/.test(value)
  && /\d/.test(value);

const limited = (value: unknown, maximum: number) => str(value).slice(0, maximum);

export function createAuthRouter() {
  const router = Router();
  const clientRole = (profileRole: string, roles: string[] = []) => {
    if (roles.includes('Super Admin')) return 'super_admin';
    if (roles.includes('Platform Admin')) return 'platform_admin';
    return profileRole;
  };
  const tenantAssignableRoleIds = new Set([
    'role-organisation-admin',
    'role-sustainability-manager',
    'role-plant-manager',
    'role-operator',
    'role-auditor',
    'role-developer',
  ]);
  const canAssignRole = (req: AuthenticatedRequest, roleId: string) => {
    const platformAdministrator = req.authorization?.roles.some((role) => role === 'Super Admin' || role === 'Platform Admin');
    return Boolean(platformAdministrator || tenantAssignableRoleIds.has(roleId));
  };
  const userUsage = async (organisationId: string) => {
    const [{ count: members, error: memberError }, { count: invitations, error: invitationError }] = await Promise.all([
      supabaseAdmin.from('organization_members').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId).is('deleted_at', null),
      supabaseAdmin.from('organization_invitations').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId).eq('status', 'pending').is('deleted_at', null),
    ]);
    if (memberError || invitationError) throw new Error(memberError?.message ?? invitationError?.message);
    return (members ?? 0) + (invitations ?? 0);
  };

  router.post('/signup', async (req, res) => {
    let userId: string | null = null, orgId: string | null = null;
    try {
      const { name, email, password, organisationName } = req.body ?? {};
      const planId = str(req.body?.planId, req.body?.plan_id) || 'plan-starter';
      const billingInterval = req.body?.billingInterval ?? req.body?.billing_interval ?? 'monthly';
      if (!str(name) || !str(email) || !str(organisationName) || !isStrongPassword(password))
        return res.status(400).json({ error: 'Name, valid email, organisation name, and a password of at least 10 characters with a letter and number are required.' });
      if (billingInterval !== 'monthly' && billingInterval !== 'yearly') return res.status(400).json({ error: 'Billing interval must be monthly or yearly.' });

      const { data: selectedPlan, error: planError } = await supabaseAdmin.from('plans').select('id, trial_days').eq('id', planId).eq('active', true).is('deleted_at', null).maybeSingle();
      if (planError || !selectedPlan) return res.status(400).json({ error: 'The selected plan is not available.' });

      const normalizedEmail = str(email).toLowerCase();
      const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail, password, email_confirm: true,
        user_metadata: { full_name: limited(name, 120), organisation_name: limited(organisationName, 180) },
      });
      if (authError || !auth.user) {
        console.warn(JSON.stringify({ level: 'warn', event: 'signup_identity_creation_failed', message: authError?.message ?? 'unknown' }));
        return res.status(400).json({ error: 'Unable to create an account with these details.' });
      }
      userId = auth.user.id;
      orgId = `org-${randomUUID()}`;

      const { data: org, error: orgError } = await supabaseAdmin.from('organisations')
        .insert({ id: orgId, name: limited(organisationName, 180) }).select('*').single();
      if (orgError || !org) throw new Error(`Organisation creation failed: ${orgError?.message ?? 'unknown error'}`);

      const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: userId, full_name: limited(name, 120), organisation_id: orgId, role: 'organisation_admin',
      }).select('*').single();
      if (profileError || !profile) throw new Error(`Profile creation failed: ${profileError?.message ?? 'unknown error'}`);

      const { error: membershipError } = await supabaseAdmin.from('organization_members').insert({ id: `member-${randomUUID()}`, organisation_id: orgId, user_id: userId, role_id: 'role-organisation-admin' });
      if (membershipError) throw new Error(`Membership creation failed: ${membershipError.message}`);
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({ id: `user-role-${randomUUID()}`, user_id: userId, role_id: 'role-organisation-admin', organisation_id: orgId });
      if (roleError) throw new Error(`Role assignment failed: ${roleError.message}`);

      const startedAt = new Date();
      const trialEndsAt = new Date(startedAt.getTime() + Number(selectedPlan.trial_days ?? 14) * 86400000);
      const subscriptionId = `sub-${randomUUID()}`;
      const { error: subscriptionError } = await supabaseAdmin.from('subscriptions').insert({
        id: subscriptionId, organisation_id: orgId, plan_id: selectedPlan.id, status: 'trial', billing_interval: billingInterval,
        started_at: startedAt.toISOString(), trial_ends_at: trialEndsAt.toISOString(), renewal_at: trialEndsAt.toISOString(),
        metadata: { source: 'signup', payment_status: 'not-connected' },
      });
      if (subscriptionError) throw new Error(`Subscription provisioning failed: ${subscriptionError.message}`);
      await syncLicenseFromSubscription(orgId, { id: subscriptionId, status: 'trial', startedAt: startedAt.toISOString(), expiresAt: null });

      const { data: session, error: sessionError } = await supabaseAuth.auth.signInWithPassword({ email: normalizedEmail, password });
      if (sessionError || !session.session) throw new Error(`Automatic login failed: ${sessionError?.message ?? 'no session'}`);
      await auditAuthEvent({ userId, organisationId: orgId, eventType: 'signup', ipAddress: req.ip, userAgent: req.get('user-agent') });

      return res.status(201).json({
        authenticated: true, accessToken: session.session.access_token,
        refreshToken: session.session.refresh_token, expiresAt: session.session.expires_at,
        user: { id: userId, name: profile.full_name, email: normalizedEmail, role: profile.role, organisationId: orgId },
        organisation: mapOrganisation(org),
      });
    } catch (e) {
      if (orgId) await supabaseAdmin.from('organisations').delete().eq('id', orgId);
      if (userId) await supabaseAdmin.auth.admin.deleteUser(userId);
      console.error(JSON.stringify({ level: 'error', event: 'signup_provisioning_failed', message: e instanceof Error ? e.message : 'unknown' }));
      return res.status(500).json({ error: 'Registration could not be completed. Please retry or contact support with the request ID.', requestId: res.getHeader('x-request-id') });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const email = str(req.body?.email).toLowerCase(), password = req.body?.password;
      if (!email || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required.' });
      const { data: auth, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
      if (error || !auth.user || !auth.session) {
        await auditAuthEvent({ eventType: 'login_failed', metadata: { email }, ipAddress: req.ip, userAgent: req.get('user-agent') });
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      let profile;
      try { profile = await getProfile(auth.user.id); }
      catch { return res.status(403).json({ error: 'Your identity is valid, but its organisation profile is missing. Ask an administrator to restore the profile.' }); }
      const { data: org, error: orgError } = await supabaseAdmin.from('organisations').select('*').eq('id', profile.organisation_id).single();
      if (orgError || !org) return res.status(403).json({ error: 'Your identity is valid, but its organisation is unavailable.' });
      const { error: loginUpdateError } = await supabaseAdmin.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', auth.user.id);
      if (loginUpdateError) console.warn(JSON.stringify({ level: 'warn', event: 'last_login_update_failed', userId: auth.user.id, message: loginUpdateError.message }));
      const authorization = await getAuthorizationContext(auth.user.id);
      await auditAuthEvent({ userId: auth.user.id, organisationId: profile.organisation_id, eventType: 'login', ipAddress: req.ip, userAgent: req.get('user-agent') });
      return res.json({
        authenticated: true, accessToken: auth.session.access_token, refreshToken: auth.session.refresh_token,
        expiresAt: auth.session.expires_at,
        user: { id: auth.user.id, name: profile.full_name, email: auth.user.email, role: clientRole(profile.role, authorization.roles), organisationId: profile.organisation_id },
        organisation: mapOrganisation(org),
      });
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', event: 'login_failed_unexpectedly', message: error instanceof Error ? error.message : 'unknown' }));
      return res.status(500).json({ error: 'Login service failed unexpectedly. Please retry; if it continues, check the server log using the request ID.', requestId: res.getHeader('x-request-id') });
    }
  });

  router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    const p = await getProfile(req.authUser!.id);
    res.json({ authenticated: true, user: { id: p.id, name: p.full_name, email: req.authUser!.email, role: clientRole(p.role, req.authorization?.roles), organisationId: p.organisation_id, avatarUrl: (p as any).avatar_url ?? '', department: (p as any).department ?? '', designation: (p as any).designation ?? '', phone: (p as any).phone ?? '', timeZone: (p as any).time_zone ?? '', language: (p as any).language ?? '', status: (p as any).status ?? 'active', lastLoginAt: (p as any).last_login_at ?? null }, authorization: req.authorization });
  });

  router.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    const body = req.body ?? {}; const updates: any = {};
    const fields: [string, string][] = [['name','full_name'],['avatarUrl','avatar_url'],['department','department'],['designation','designation'],['phone','phone'],['timeZone','time_zone'],['language','language']];
    for (const [input, column] of fields) if (body[input] !== undefined) updates[column] = limited(body[input], input === 'avatarUrl' ? 1000 : 160);
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Provide at least one profile field to update.' });
    const { data, error } = await supabaseAdmin.from('profiles').update(updates).eq('id', req.authUser!.id).select('*').single();
    if (error || !data) return res.status(400).json({ error: error?.message ?? 'Unable to update profile.' });
    await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization!.organisationId, eventType: 'profile_updated' });
    res.json({ success: true, profile: data });
  });

  router.get('/permissions', requireAuth, (req: AuthenticatedRequest, res) => res.json({ permissions: req.authorization?.permissions ?? [] }));
  router.get('/roles', requireAuth, (req: AuthenticatedRequest, res) => res.json({ roles: req.authorization?.roles ?? [] }));

  router.post('/refresh', async (req, res) => {
    const refreshToken = str(req.body?.refreshToken, req.body?.refresh_token);
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required.' });
    const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user) return res.status(401).json({ error: 'Session refresh failed.' });
    const profile = await getProfile(data.user.id);
    const authorization = await getAuthorizationContext(data.user.id);
    return res.json({ authenticated: true, accessToken: data.session.access_token, refreshToken: data.session.refresh_token, expiresAt: data.session.expires_at, user: { id: profile.id, name: profile.full_name, email: data.user.email, role: clientRole(profile.role, authorization.roles), organisationId: profile.organisation_id } });
  });

  router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res) => {
    await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization?.organisationId, eventType: 'logout', ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.json({ success: true });
  });

  router.post('/logout-all', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { error } = await (supabaseAdmin.auth.admin as any).signOut(req.authUser!.id, 'global');
    if (error) return res.status(500).json({ error: error.message });
    await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization?.organisationId, eventType: 'logout_all_devices', ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.json({ success: true });
  });

  router.post('/password-reset', async (req, res) => {
    const email = str(req.body?.email).toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, { redirectTo: process.env.APP_URL || undefined });
    if (error) console.warn(JSON.stringify({ level: 'warn', event: 'password_reset_request_failed', message: error.message }));
    res.json({ success: true });
  });

  router.post('/password-update', requireAuth, async (req: AuthenticatedRequest, res) => {
    const password = req.body?.password;
    if (!isStrongPassword(password)) return res.status(400).json({ error: 'Password must be at least 10 characters and contain a letter and number.' });
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.authUser!.id, { password });
    if (error) return res.status(400).json({ error: error.message });
    await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization!.organisationId, eventType: 'password_updated', ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.json({ success: true });
  });

  router.get('/memberships', requireAuth, requirePermission('organization.manage'), async (req: AuthenticatedRequest, res) => {
    const { data, error } = await supabaseAdmin.from('organization_members').select('id, user_id, role_id, created_at, deleted_at, roles(name)').eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null);
    if (error) return res.status(500).json({ error: error.message });
    const memberships = data ?? [];
    const userIds = memberships.map((membership: any) => membership.user_id).filter(Boolean);
    const { data: profiles, error: profileError } = userIds.length
      ? await supabaseAdmin.from('profiles').select('id,full_name,status,last_login_at').in('id', userIds)
      : { data: [], error: null };
    if (profileError) return res.status(500).json({ error: profileError.message });
    const profileById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    const authUsers = await Promise.all(userIds.map(async (userId: string) => {
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
      return [userId, authData.user?.email ?? ''] as const;
    }));
    const emailById = new Map(authUsers);
    res.json({
      memberships: memberships.map((membership: any) => ({
        ...membership,
        profile: profileById.get(membership.user_id) ?? null,
        email: emailById.get(membership.user_id) ?? '',
      })),
    });
  });

  router.get('/invitations', requireAuth, requirePermission('organization.manage'), async (req: AuthenticatedRequest, res) => {
    const { data, error } = await supabaseAdmin.from('organization_invitations')
      .select('id,email,role_id,status,expires_at,created_at,roles(name)')
      .eq('organisation_id', req.authorization!.organisationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ invitations: data ?? [] });
  });

  router.get('/role-catalog', requireAuth, requirePermission('organization.manage'), async (req: AuthenticatedRequest, res) => {
    let query = supabaseAdmin.from('roles').select('id,name,description').is('deleted_at', null).order('name');
    if (!req.authorization?.roles.some((role) => role === 'Super Admin' || role === 'Platform Admin')) query = query.in('id', [...tenantAssignableRoleIds]);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ roles: data ?? [] });
  });

  router.patch('/memberships/:id', requireAuth, requireOperationalLicense, requirePermission('organization.manage'), async (req: AuthenticatedRequest, res) => {
    const roleId = str(req.body?.roleId, req.body?.role_id);
    if (!roleId) return res.status(400).json({ error: 'Role is required.' });
    if (!canAssignRole(req, roleId)) return res.status(403).json({ error: 'This role can only be assigned by a platform administrator.' });
    const { data: membership, error: membershipError } = await supabaseAdmin.from('organization_members').select('user_id').eq('id', req.params.id).eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null).single();
    if (membershipError || !membership) return res.status(404).json({ error: 'Membership not found.' });
    const { error } = await supabaseAdmin.from('organization_members').update({ role_id: roleId }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    await supabaseAdmin.from('user_roles').update({ deleted_at: new Date().toISOString() }).eq('user_id', membership.user_id).eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null);
    await supabaseAdmin.from('user_roles').insert({ id: `user-role-${randomUUID()}`, user_id: membership.user_id, role_id: roleId, organisation_id: req.authorization!.organisationId });
    await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization!.organisationId, eventType: 'role_changed', metadata: { membershipId: req.params.id, roleId } });
    res.json({ success: true });
  });

  router.delete('/memberships/:id', requireAuth, requireOperationalLicense, requirePermission('organization.manage'), async (req: AuthenticatedRequest, res) => {
    const { data: membership, error: lookupError } = await supabaseAdmin.from('organization_members').select('user_id').eq('id', req.params.id).eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null).single();
    if (lookupError || !membership) return res.status(404).json({ error: 'Membership not found.' });
    if (membership.user_id === req.authUser!.id) return res.status(400).json({ error: 'You cannot remove your own membership.' });
    await supabaseAdmin.from('organization_members').update({ deleted_at: new Date().toISOString() }).eq('id', req.params.id);
    await supabaseAdmin.from('user_roles').update({ deleted_at: new Date().toISOString() }).eq('user_id', membership.user_id).eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null);
    await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization!.organisationId, eventType: 'member_removed', metadata: { membershipId: req.params.id } });
    await syncUsage(req.authorization!.organisationId, 'users', await userUsage(req.authorization!.organisationId));
    res.json({ success: true });
  });

  router.get('/audit-events', requireAuth, requirePermission('audit.view'), requireEntitlement('security.audit_logs'), async (req: AuthenticatedRequest, res) => {
    const { data, error } = await supabaseAdmin.from('auth_events').select('*').eq('organisation_id', req.authorization!.organisationId).order('created_at', { ascending: false }).limit(100);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ events: data ?? [] });
  });

  router.post('/invitations', requireAuth, requireOperationalLicense, requirePermission('organization.manage'), requireLimit('users', userUsage), async (req: AuthenticatedRequest, res) => {
    const email = str(req.body?.email).toLowerCase(), roleId = str(req.body?.roleId, req.body?.role_id);
    if (!email || !roleId) return res.status(400).json({ error: 'Email and role are required.' });
    if (!canAssignRole(req, roleId)) return res.status(403).json({ error: 'This role can only be assigned by a platform administrator.' });
    const row = { id: `invite-${randomUUID()}`, organisation_id: req.authorization!.organisationId, email, role_id: roleId, invited_by: req.authUser!.id, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
    const { data, error } = await supabaseAdmin.from('organization_invitations').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create invitation.' });
    await syncUsage(req.authorization!.organisationId, 'users', await userUsage(req.authorization!.organisationId));
    await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization!.organisationId, eventType: 'invite_created', metadata: { invitationId: data.id, email } });
    res.status(201).json({ success: true, invitation: data });
  });

  router.delete('/invitations/:id', requireAuth, requireOperationalLicense, requirePermission('organization.manage'), async (req: AuthenticatedRequest, res) => {
    const { data, error } = await supabaseAdmin.from('organization_invitations')
      .update({ status: 'revoked', deleted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('organisation_id', req.authorization!.organisationId)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Pending invitation not found.' });
    await syncUsage(req.authorization!.organisationId, 'users', await userUsage(req.authorization!.organisationId));
    await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization!.organisationId, eventType: 'invite_revoked', metadata: { invitationId: req.params.id } });
    res.json({ success: true });
  });

  return router;
}
