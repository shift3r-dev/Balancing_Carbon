import { Router, type NextFunction, type Response } from 'express';
import { type AuthenticatedRequest, requireAuth } from '../auth.js';
import { auditAuthEvent } from '../authorization.js';
import { syncLicenseFromSubscription } from '../entitlementService.js';
import { str } from '../requestUtils.js';
import { supabaseAdmin } from '../supabaseClients.js';
import { getPricingCatalog } from '../subscriptionService.js';

const PLATFORM_ROLES = new Set(['Super Admin', 'Platform Admin']);

function requirePlatformAdministrator(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.authorization?.roles.some((role) => PLATFORM_ROLES.has(role))) {
    return res.status(403).json({ error: 'Platform administrator access is required.' });
  }
  next();
}

function relationName(value: any) {
  if (Array.isArray(value)) return value[0]?.name ?? '';
  return value?.name ?? '';
}

function latestByOrganisation(rows: any[]) {
  const result = new Map<string, any>();
  for (const row of rows) if (!result.has(row.organisation_id)) result.set(row.organisation_id, row);
  return result;
}

async function loadCustomerDirectory() {
  const [organisationResult, membershipResult, facilityResult, activityResult, subscriptionResult, licenseResult] = await Promise.all([
    supabaseAdmin.from('organisations').select('id,name,industry,location,created_at,updated_at').order('created_at', { ascending: false }).limit(1000),
    supabaseAdmin.from('organization_members').select('organisation_id,user_id').is('deleted_at', null).limit(10000),
    supabaseAdmin.from('facilities').select('organisation_id,id').is('deleted_at', null).limit(10000),
    supabaseAdmin.from('activity_records').select('organisation_id,id').is('deleted_at', null).limit(10000),
    supabaseAdmin.from('subscriptions').select('id,organisation_id,plan_id,status,billing_interval,renewal_at,created_at,plans(name,slug)').is('deleted_at', null).order('created_at', { ascending: false }).limit(5000),
    supabaseAdmin.from('license_assignments').select('organisation_id,status,expires_at,read_only,created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(5000),
  ]);
  const error = organisationResult.error ?? membershipResult.error ?? facilityResult.error ?? activityResult.error ?? subscriptionResult.error ?? licenseResult.error;
  if (error) throw new Error(error.message);

  const membershipCounts = new Map<string, number>();
  const facilityCounts = new Map<string, number>();
  const activityCounts = new Map<string, number>();
  for (const row of membershipResult.data ?? []) membershipCounts.set(row.organisation_id, (membershipCounts.get(row.organisation_id) ?? 0) + 1);
  for (const row of facilityResult.data ?? []) facilityCounts.set(row.organisation_id, (facilityCounts.get(row.organisation_id) ?? 0) + 1);
  for (const row of activityResult.data ?? []) activityCounts.set(row.organisation_id, (activityCounts.get(row.organisation_id) ?? 0) + 1);
  const subscriptions = latestByOrganisation(subscriptionResult.data ?? []);
  const licenses = latestByOrganisation(licenseResult.data ?? []);

  return (organisationResult.data ?? []).map((organisation: any) => {
    const subscription = subscriptions.get(organisation.id);
    const license = licenses.get(organisation.id);
    return {
      id: organisation.id,
      name: organisation.name,
      industry: organisation.industry ?? '',
      location: organisation.location ?? '',
      createdAt: organisation.created_at,
      updatedAt: organisation.updated_at,
      members: membershipCounts.get(organisation.id) ?? 0,
      facilities: facilityCounts.get(organisation.id) ?? 0,
      activityRecords: activityCounts.get(organisation.id) ?? 0,
      subscriptionId: subscription?.id ?? null,
      subscriptionStatus: subscription?.status ?? 'not-configured',
      billingInterval: subscription?.billing_interval ?? null,
      renewalAt: subscription?.renewal_at ?? null,
      planId: subscription?.plan_id ?? null,
      planName: relationName(subscription?.plans) || 'No plan',
      licenseStatus: license?.status ?? 'not-configured',
      licenseReadOnly: Boolean(license?.read_only),
      licenseExpiresAt: license?.expires_at ?? null,
    };
  });
}

async function listAllAuthUsers() {
  const users: any[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) break;
  }
  return users;
}

export function createPlatformAdminRouter() {
  const router = Router();
  router.use('/platform-admin', requireAuth, requirePlatformAdministrator);

  router.get('/platform-admin/overview', async (_req, res) => {
    try {
      const [customers, users, auditResult] = await Promise.all([
        loadCustomerDirectory(),
        listAllAuthUsers(),
        supabaseAdmin.from('auth_events').select('id,user_id,organisation_id,event_type,metadata,created_at').order('created_at', { ascending: false }).limit(30),
      ]);
      if (auditResult.error) throw new Error(auditResult.error.message);
      res.json({
        summary: {
          organisations: customers.length,
          activeCustomers: customers.filter((customer) => ['active', 'trial'].includes(customer.subscriptionStatus)).length,
          suspendedCustomers: customers.filter((customer) => customer.subscriptionStatus === 'suspended' || customer.licenseStatus === 'suspended').length,
          users: users.length,
          facilities: customers.reduce((total, customer) => total + customer.facilities, 0),
          activityRecords: customers.reduce((total, customer) => total + customer.activityRecords, 0),
        },
        recentOrganisations: customers.slice(0, 8),
        recentEvents: auditResult.data ?? [],
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load platform overview.' });
    }
  });

  router.get('/platform-admin/organisations', async (_req, res) => {
    try { res.json({ organisations: await loadCustomerDirectory() }); }
    catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load customer organisations.' }); }
  });

  router.get('/platform-admin/users', async (_req, res) => {
    try {
      const [profileResult, roleResult, authUsers] = await Promise.all([
        supabaseAdmin.from('profiles').select('id,full_name,organisation_id,role,status,last_login_at,created_at,organisations(name)').order('created_at', { ascending: false }).limit(10000),
        supabaseAdmin.from('user_roles').select('user_id,role_id,roles(name)').is('deleted_at', null).limit(10000),
        listAllAuthUsers(),
      ]);
      const error = profileResult.error ?? roleResult.error;
      if (error) throw new Error(error.message);
      const authById = new Map(authUsers.map((user: any) => [user.id, user]));
      const rolesByUser = new Map<string, string[]>();
      for (const row of roleResult.data ?? []) {
        const roles = rolesByUser.get(row.user_id) ?? [];
        const roleName = relationName(row.roles);
        if (roleName && !roles.includes(roleName)) roles.push(roleName);
        rolesByUser.set(row.user_id, roles);
      }
      res.json({ users: (profileResult.data ?? []).map((profile: any) => {
        const authUser: any = authById.get(profile.id);
        return {
          id: profile.id,
          name: profile.full_name,
          email: authUser?.email ?? '',
          organisationId: profile.organisation_id,
          organisationName: relationName(profile.organisations) || 'Unknown organisation',
          profileRole: profile.role,
          roles: rolesByUser.get(profile.id) ?? [],
          status: profile.status ?? 'active',
          lastLoginAt: profile.last_login_at,
          createdAt: profile.created_at,
          emailConfirmed: Boolean(authUser?.email_confirmed_at),
        };
      }) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load platform users.' });
    }
  });

  router.get('/platform-admin/pricing', async (_req, res) => {
    try {
      const catalog = await getPricingCatalog();
      res.json(catalog);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load pricing configuration.' });
    }
  });

  router.patch('/platform-admin/pricing/plans/:id', async (req: AuthenticatedRequest, res) => {
    const body = req.body ?? {};
    const planId = str(req.params.id);
    const updates: Record<string, unknown> = {};
    const textFields: Array<[string, string]> = [['name','name'],['description','description'],['valueProposition','value_proposition'],['badge','badge'],['ctaLabel','cta_label'],['ctaAction','cta_action']];
    for (const [client, database] of textFields) if (body[client] !== undefined) updates[database] = str(body[client]);
    for (const [client, database] of [['active','active'],['visible','visible'],['recommended','recommended'],['contactSales','contact_sales']] as const) if (typeof body[client] === 'boolean') updates[database] = body[client];
    for (const [client, database] of [['monthlyPrice','monthly_price'],['yearlyPrice','yearly_price']] as const) if (body[client] !== undefined) { const value = Number(body[client]); if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: `${client} must be a non-negative number.` }); updates[database] = value; }
    if (body.targetAudience !== undefined) updates.target_audience = Array.isArray(body.targetAudience) ? body.targetAudience.map((item: unknown) => str(item)).filter(Boolean).slice(0, 20) : [];
    if (body.promotion !== undefined) updates.promotion = typeof body.promotion === 'object' && body.promotion ? body.promotion : {};
    if (body.regionalPrices !== undefined) updates.regional_prices = typeof body.regionalPrices === 'object' && body.regionalPrices ? body.regionalPrices : {};
    try {
      if (Object.keys(updates).length) {
        const result = await supabaseAdmin.from('plans').update(updates).eq('id', planId).is('deleted_at', null);
        if (result.error) throw new Error(result.error.message);
      }
      if (Array.isArray(body.features)) for (const feature of body.features.slice(0, 100)) {
        if (!['included','not-included','custom','coming-soon'].includes(str(feature.availability))) return res.status(400).json({ error: 'Unsupported feature availability.' });
        const result = await supabaseAdmin.from('plan_features').update({ availability: str(feature.availability), label: str(feature.label), category: str(feature.category) }).eq('plan_id', planId).eq('feature_key', str(feature.key));
        if (result.error) throw new Error(result.error.message);
      }
      if (Array.isArray(body.limits)) for (const limit of body.limits.slice(0, 100)) {
        const type = str(limit.type); if (!['number','unlimited','custom'].includes(type)) return res.status(400).json({ error: 'Unsupported limit type.' });
        const numericValue = type === 'number' ? Number(limit.value) : null; if (type === 'number' && (!Number.isFinite(numericValue) || numericValue < 0)) return res.status(400).json({ error: 'Numeric limits must be non-negative.' });
        const result = await supabaseAdmin.from('plan_limits').update({ value_type: type, numeric_value: numericValue, display_value: str(limit.displayValue), unit: str(limit.unit) }).eq('plan_id', planId).eq('limit_key', str(limit.key));
        if (result.error) throw new Error(result.error.message);
      }
      await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization!.organisationId, eventType: 'platform_pricing_plan_updated', metadata: { planId, fields: Object.keys(updates), featureCount: body.features?.length ?? 0, limitCount: body.limits?.length ?? 0 } });
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to update pricing plan.' }); }
  });

  router.patch('/platform-admin/pricing/addons/:id', async (req: AuthenticatedRequest, res) => {
    const body = req.body ?? {}, updates: Record<string, unknown> = {};
    for (const [client, database] of [['name','name'],['description','description'],['benefit','benefit'],['pricingLabel','pricing_label'],['category','category']] as const) if (body[client] !== undefined) updates[database] = str(body[client]);
    if (typeof body.visible === 'boolean') updates.visible = body.visible;
    const { error } = await supabaseAdmin.from('pricing_addons').update(updates).eq('id', str(req.params.id)).is('deleted_at', null);
    if (error) return res.status(500).json({ error: error.message });
    await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization!.organisationId, eventType: 'platform_pricing_addon_updated', metadata: { addonId: req.params.id, fields: Object.keys(updates) } });
    res.json({ success: true });
  });

  router.patch('/platform-admin/pricing/implementation-services/:id', async (req: AuthenticatedRequest, res) => {
    const body = req.body ?? {}, updates: Record<string, unknown> = {};
    for (const [client, database] of [['name','name'],['description','description'],['pricingLabel','pricing_label']] as const) if (body[client] !== undefined) updates[database] = str(body[client]);
    if (typeof body.visible === 'boolean') updates.visible = body.visible;
    const { error } = await supabaseAdmin.from('implementation_services').update(updates).eq('id', str(req.params.id)).is('deleted_at', null);
    if (error) return res.status(500).json({ error: error.message });
    await auditAuthEvent({ userId: req.authUser!.id, organisationId: req.authorization!.organisationId, eventType: 'platform_implementation_service_updated', metadata: { serviceId: req.params.id, fields: Object.keys(updates) } });
    res.json({ success: true });
  });

  router.patch('/platform-admin/organisations/:id', async (req: AuthenticatedRequest, res) => {
    const targetOrganisationId = str(req.params.id);
    const status = str(req.body?.status);
    const planId = str(req.body?.planId, req.body?.plan_id);
    if (targetOrganisationId === req.authorization!.organisationId && status === 'suspended') return res.status(400).json({ error: 'You cannot suspend your own platform organisation.' });
    if (status && !['active', 'suspended', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Status must be active, suspended, or cancelled.' });
    try {
      const { data: subscription, error: subscriptionError } = await supabaseAdmin.from('subscriptions').select('id,status,started_at,expires_at,plan_id').eq('organisation_id', targetOrganisationId).is('deleted_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (subscriptionError) throw new Error(subscriptionError.message);
      if (!subscription) return res.status(404).json({ error: 'This organisation does not have a subscription record.' });
      if (planId) {
        const { data: plan, error: planError } = await supabaseAdmin.from('plans').select('id').eq('id', planId).eq('active', true).is('deleted_at', null).maybeSingle();
        if (planError || !plan) return res.status(400).json({ error: 'The selected plan is not available.' });
      }
      const updates: Record<string, unknown> = {};
      if (status) updates.status = status;
      if (planId) updates.plan_id = planId;
      if (!Object.keys(updates).length) return res.status(400).json({ error: 'A status or plan change is required.' });
      const { data: updated, error: updateError } = await supabaseAdmin.from('subscriptions').update(updates).eq('id', subscription.id).select('id,status,started_at,expires_at').single();
      if (updateError || !updated) throw new Error(updateError?.message ?? 'Subscription update failed.');
      await syncLicenseFromSubscription(targetOrganisationId, { id: updated.id, status: updated.status, startedAt: updated.started_at, expiresAt: updated.expires_at });
      await auditAuthEvent({ userId: req.authUser!.id, organisationId: targetOrganisationId, eventType: 'platform_customer_updated', metadata: { status: status || subscription.status, planId: planId || subscription.plan_id, actorOrganisationId: req.authorization!.organisationId } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to update customer organisation.' });
    }
  });

  router.patch('/platform-admin/users/:id/status', async (req: AuthenticatedRequest, res) => {
    const targetUserId = str(req.params.id);
    const status = str(req.body?.status);
    if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Status must be active or suspended.' });
    if (targetUserId === req.authUser!.id && status === 'suspended') return res.status(400).json({ error: 'You cannot suspend your own account.' });
    try {
      const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('id,organisation_id,status').eq('id', targetUserId).maybeSingle();
      if (profileError) throw new Error(profileError.message);
      if (!profile) return res.status(404).json({ error: 'User profile not found.' });

      if (status === 'suspended') {
        const { data: targetRoles, error: roleError } = await supabaseAdmin.from('user_roles').select('role_id').eq('user_id', targetUserId).in('role_id', ['role-super-admin', 'role-platform-admin']).is('deleted_at', null);
        if (roleError) throw new Error(roleError.message);
        if ((targetRoles ?? []).length) {
          const { data: platformRoles, error: platformRoleError } = await supabaseAdmin.from('user_roles').select('user_id').in('role_id', ['role-super-admin', 'role-platform-admin']).is('deleted_at', null);
          if (platformRoleError) throw new Error(platformRoleError.message);
          const platformUserIds = [...new Set((platformRoles ?? []).map((row: any) => row.user_id))];
          const { count, error: activeAdminError } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).in('id', platformUserIds).eq('status', 'active');
          if (activeAdminError) throw new Error(activeAdminError.message);
          if ((count ?? 0) <= 1) return res.status(400).json({ error: 'The final active platform administrator cannot be suspended.' });
        }
      }

      const { error: updateError } = await supabaseAdmin.from('profiles').update({ status }).eq('id', targetUserId);
      if (updateError) throw new Error(updateError.message);
      await auditAuthEvent({ userId: req.authUser!.id, organisationId: profile.organisation_id, eventType: `platform_user_${status}`, metadata: { targetUserId, previousStatus: profile.status, actorOrganisationId: req.authorization!.organisationId } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to update user status.' });
    }
  });

  return router;
}
