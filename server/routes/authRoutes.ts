import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { auditAuthEvent } from '../authorization.js';
import { syncLicenseFromSubscription, syncUsage } from '../entitlementService.js';
import { requireEntitlement, requireLimit, requireOperationalLicense } from '../middleware/entitlements.js';
import { str } from '../requestUtils.js';
import { mapOrganisation } from '../rowMappers.js';
import { supabaseAdmin, supabaseAuth } from '../supabaseClients.js';

export function createAuthRouter() {
  const router = Router();
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
      if (!str(name) || !str(email) || !str(organisationName) || typeof password !== 'string' || password.length < 8)
        return res.status(400).json({ error: 'Name, valid email, organisation name, and password of at least 8 characters are required.' });
      if (billingInterval !== 'monthly' && billingInterval !== 'yearly') return res.status(400).json({ error: 'Billing interval must be monthly or yearly.' });

      const { data: selectedPlan, error: planError } = await supabaseAdmin.from('plans').select('id, trial_days').eq('id', planId).eq('active', true).is('deleted_at', null).maybeSingle();
      if (planError || !selectedPlan) return res.status(400).json({ error: 'The selected plan is not available.' });

      const normalizedEmail = str(email).toLowerCase();
      const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail, password, email_confirm: true,
        user_metadata: { full_name: str(name), organisation_name: str(organisationName) },
      });
      if (authError || !auth.user) return res.status(400).json({ error: authError?.message ?? 'Unable to create account.' });
      userId = auth.user.id;
      orgId = `org-${randomUUID()}`;

      const { data: org, error: orgError } = await supabaseAdmin.from('organisations')
        .insert({ id: orgId, name: str(organisationName) }).select('*').single();
      if (orgError || !org) throw new Error(`Organisation creation failed: ${orgError?.message ?? 'unknown error'}`);

      const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: userId, full_name: str(name), organisation_id: orgId, role: 'organisation_admin',
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
      return res.status(500).json({ error: e instanceof Error ? e.message : 'Registration failed.' });
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
      await auditAuthEvent({ userId: auth.user.id, organisationId: profile.organisation_id, eventType: 'login', ipAddress: req.ip, userAgent: req.get('user-agent') });
      return res.json({
        authenticated: true, accessToken: auth.session.access_token, refreshToken: auth.session.refresh_token,
        expiresAt: auth.session.expires_at,
        user: { id: auth.user.id, name: profile.full_name, email: auth.user.email, role: profile.role, organisationId: profile.organisation_id },
        organisation: mapOrganisation(org),
      });
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', event: 'login_failed_unexpectedly', message: error instanceof Error ? error.message : 'unknown' }));
      return res.status(500).json({ error: 'Login service failed unexpectedly. Please retry; if it continues, check the server log using the request ID.', requestId: res.getHeader('x-request-id') });
    }
  });

  router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    const p = await getProfile(req.authUser!.id);
    res.json({ authenticated: true, user: { id: p.id, name: p.full_name, email: req.authUser!.email, role: p.role, organisationId: p.organisation_id, avatarUrl: (p as any).avatar_url ?? '', department: (p as any).department ?? '', designation: (p as any).designation ?? '', phone: (p as any).phone ?? '', timeZone: (p as any).time_zone ?? '', language: (p as any).language ?? '', status: (p as any).status ?? 'active', lastLoginAt: (p as any).last_login_at ?? null }, authorization: req.authorization });
  });

  router.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    const body = req.body ?? {}; const updates: any = {};
    const fields: [string, string][] = [['name','full_name'],['avatarUrl','avatar_url'],['department','department'],['designation','designation'],['phone','phone'],['timeZone','time_zone'],['language','language']];
    for (const [input, column] of fields) if (body[input] !== undefined) updates[column] = str(body[input]);
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
    return res.json({ authenticated: true, accessToken: data.session.access_token, refreshToken: data.session.refresh_token, expiresAt: data.session.expires_at, user: { id: profile.id, name: profile.full_name, email: data.user.email, role: profile.role, organisationId: profile.organisation_id } });
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
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  router.post('/password-update', requireAuth, async (req: AuthenticatedRequest, res) => {
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.authUser!.id, { password });
    if (error) return res.status(400).json({ error: error.message });
    await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization!.organisationId, eventType: 'password_updated', ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.json({ success: true });
  });

  router.get('/memberships', requireAuth, requirePermission('organization.manage'), async (req: AuthenticatedRequest, res) => {
    const { data, error } = await supabaseAdmin.from('organization_members').select('id, user_id, role_id, created_at, deleted_at, roles(name)').eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ memberships: data ?? [] });
  });

  router.get('/role-catalog', requireAuth, requirePermission('organization.manage'), async (_req, res) => {
    const { data, error } = await supabaseAdmin.from('roles').select('id,name,description').is('deleted_at', null).order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ roles: data ?? [] });
  });

  router.patch('/memberships/:id', requireAuth, requireOperationalLicense, requirePermission('organization.manage'), async (req: AuthenticatedRequest, res) => {
    const roleId = str(req.body?.roleId, req.body?.role_id);
    if (!roleId) return res.status(400).json({ error: 'Role is required.' });
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
    const row = { id: `invite-${randomUUID()}`, organisation_id: req.authorization!.organisationId, email, role_id: roleId, invited_by: req.authUser!.id, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
    const { data, error } = await supabaseAdmin.from('organization_invitations').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create invitation.' });
    await syncUsage(req.authorization!.organisationId, 'users', await userUsage(req.authorization!.organisationId));
    await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization!.organisationId, eventType: 'invite_created', metadata: { invitationId: data.id, email } });
    res.status(201).json({ success: true, invitation: data });
  });

  return router;
}
