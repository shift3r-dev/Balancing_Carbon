import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { auditAuthEvent } from '../authorization.js';
import { str } from '../requestUtils.js';
import { mapOrganisation } from '../rowMappers.js';
import { supabaseAdmin, supabaseAuth } from '../supabaseClients.js';

export function createAuthRouter() {
  const router = Router();

  router.post('/signup', async (req, res) => {
    let userId: string | null = null, orgId: string | null = null;
    try {
      const { name, email, password, organisationName } = req.body ?? {};
      if (!str(name) || !str(email) || !str(organisationName) || typeof password !== 'string' || password.length < 8)
        return res.status(400).json({ error: 'Name, valid email, organisation name, and password of at least 8 characters are required.' });

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
    const email = str(req.body?.email).toLowerCase(), password = req.body?.password;
    if (!email || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required.' });
    const { data: auth, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error || !auth.user || !auth.session) {
      await auditAuthEvent({ eventType: 'login_failed', metadata: { email }, ipAddress: req.ip, userAgent: req.get('user-agent') });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const profile = await getProfile(auth.user.id);
    const { data: org } = await supabaseAdmin.from('organisations').select('*').eq('id', profile.organisation_id).single();
    await supabaseAdmin.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', auth.user.id);
    await auditAuthEvent({ userId: auth.user.id, organisationId: profile.organisation_id, eventType: 'login', ipAddress: req.ip, userAgent: req.get('user-agent') });
    return res.json({
      authenticated: true, accessToken: auth.session.access_token, refreshToken: auth.session.refresh_token,
      expiresAt: auth.session.expires_at,
      user: { id: auth.user.id, name: profile.full_name, email: auth.user.email, role: profile.role, organisationId: profile.organisation_id },
      organisation: org ? mapOrganisation(org) : null,
    });
  });

  router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    const p = await getProfile(req.authUser!.id);
    res.json({ authenticated: true, user: { id: p.id, name: p.full_name, email: req.authUser!.email, role: p.role, organisationId: p.organisation_id }, authorization: req.authorization });
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

  router.get('/memberships', requireAuth, requirePermission('organization.manage'), async (req: AuthenticatedRequest, res) => {
    const { data, error } = await supabaseAdmin.from('organization_members').select('id, user_id, role_id, created_at, deleted_at, roles(name)').eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ memberships: data ?? [] });
  });

  router.get('/audit-events', requireAuth, requirePermission('audit.view'), async (req: AuthenticatedRequest, res) => {
    const { data, error } = await supabaseAdmin.from('auth_events').select('*').eq('organisation_id', req.authorization!.organisationId).order('created_at', { ascending: false }).limit(100);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ events: data ?? [] });
  });

  router.post('/invitations', requireAuth, requirePermission('organization.manage'), async (req: AuthenticatedRequest, res) => {
    const email = str(req.body?.email).toLowerCase(), roleId = str(req.body?.roleId, req.body?.role_id);
    if (!email || !roleId) return res.status(400).json({ error: 'Email and role are required.' });
    const row = { id: `invite-${randomUUID()}`, organisation_id: req.authorization!.organisationId, email, role_id: roleId, invited_by: req.authUser!.id, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
    const { data, error } = await supabaseAdmin.from('organization_invitations').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create invitation.' });
    await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization!.organisationId, eventType: 'invite_created', metadata: { invitationId: data.id, email } });
    res.status(201).json({ success: true, invitation: data });
  });

  return router;
}
