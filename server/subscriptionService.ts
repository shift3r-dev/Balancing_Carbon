import { randomUUID } from 'node:crypto';
import { syncLicenseFromSubscription } from './entitlementService.js';
import { supabaseAdmin } from './supabaseClients.js';
import { defaultImplementationServices, defaultPricingAddons, defaultPricingPlans } from '../shared/pricingCatalog.js';

const mapPlan = (row: any) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  valueProposition: row.value_proposition ?? '',
  targetAudience: Array.isArray(row.target_audience) ? row.target_audience : [],
  monthlyPrice: Number(row.monthly_price ?? 0),
  yearlyPrice: Number(row.yearly_price ?? 0),
  currency: row.currency,
  trialDays: Number(row.trial_days ?? 0),
  recommended: Boolean(row.recommended),
  badge: row.badge ?? '',
  ctaLabel: row.cta_label ?? 'Get started',
  ctaAction: row.cta_action ?? 'register',
  contactSales: Boolean(row.contact_sales),
  regionalPrices: row.regional_prices ?? {},
  promotion: row.promotion ?? {},
  visible: row.visible !== false,
  active: Boolean(row.active),
  sortOrder: Number(row.sort_order ?? 0),
  features: (row.plan_features ?? []).sort((left: any, right: any) => left.sort_order - right.sort_order).map((feature: any) => ({ key: feature.feature_key, label: feature.label, category: feature.category, availability: feature.availability })),
  limits: (row.plan_limits ?? []).map((limit: any) => ({ key: limit.limit_key, type: limit.value_type, value: limit.numeric_value === null ? null : Number(limit.numeric_value), displayValue: limit.display_value, unit: limit.unit })),
});

export async function getPlans() {
  const { data, error } = await supabaseAdmin.from('plans').select('*, plan_features(*), plan_limits(*)').eq('active', true).is('deleted_at', null).order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPlan);
}

export async function getPricingCatalog() {
  const [plansResult, addonsResult, servicesResult] = await Promise.all([
    supabaseAdmin.from('plans').select('*, plan_features(*), plan_limits(*)').eq('active', true).eq('visible', true).is('deleted_at', null).order('sort_order'),
    supabaseAdmin.from('pricing_addons').select('*').eq('visible', true).is('deleted_at', null).order('sort_order'),
    supabaseAdmin.from('implementation_services').select('*').eq('visible', true).is('deleted_at', null).order('sort_order'),
  ]);
  if (plansResult.error || addonsResult.error || servicesResult.error || !(plansResult.data ?? []).some((plan: any) => plan.id === 'plan-free')) {
    return { plans: defaultPricingPlans, addons: defaultPricingAddons, implementationServices: defaultImplementationServices, source: 'default-configuration' };
  }
  return {
    plans: (plansResult.data ?? []).map(mapPlan),
    addons: (addonsResult.data ?? []).map((row: any) => ({ id: row.id, key: row.addon_key, name: row.name, description: row.description, benefit: row.benefit, pricingLabel: row.pricing_label, category: row.category, visible: row.visible, sortOrder: row.sort_order })),
    implementationServices: (servicesResult.data ?? []).map((row: any) => ({ id: row.id, key: row.service_key, name: row.name, description: row.description, pricingLabel: row.pricing_label, visible: row.visible, sortOrder: row.sort_order })),
    source: 'database',
  };
}

export async function getSubscription(organisationId: string) {
  const { data, error } = await supabaseAdmin.from('subscriptions').select('*, plans(*, plan_features(*), plan_limits(*))').eq('organisation_id', organisationId).is('deleted_at', null).in('status', ['trial', 'active', 'paused', 'pending', 'suspended', 'cancelled', 'expired']).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { id: data.id, status: data.status, billingInterval: data.billing_interval, startedAt: data.started_at, trialEndsAt: data.trial_ends_at, renewalAt: data.renewal_at, expiresAt: data.expires_at, cancelledAt: data.cancelled_at, cancellationReason: data.cancellation_reason, plan: data.plans ? mapPlan(data.plans) : null };
}

export async function subscriptionUsage(organisationId: string) {
  const [facilityResult, userResult, reportResult] = await Promise.all([
    supabaseAdmin.from('facilities').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId),
    supabaseAdmin.from('organization_members').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId).is('deleted_at', null),
    supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId),
  ]);
  const error = facilityResult.error ?? userResult.error ?? reportResult.error;
  if (error) throw new Error(error.message);
  return { facilities: facilityResult.count ?? 0, users: userResult.count ?? 0, reportsGenerated: reportResult.count ?? 0, storageGb: 0, limitsEnforced: false };
}

async function getActivePlan(planId: string) {
  const { data, error } = await supabaseAdmin.from('plans').select('id, trial_days').eq('id', planId).eq('active', true).is('deleted_at', null).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The selected plan is not available.');
  return data;
}

const nextRenewalAt = (billingInterval: 'monthly' | 'yearly') => new Date(Date.now() + (billingInterval === 'yearly' ? 365 : 30) * 86400000).toISOString();

export async function changeSubscription(input: { organisationId: string; userId: string; planId?: string; billingInterval?: 'monthly' | 'yearly'; action: 'upgrade' | 'cancel' | 'renew' }) {
  const current = await getSubscription(input.organisationId);
  if (!current) throw new Error('Subscription not found.');
  let updates: any = {};
  if (input.action === 'upgrade') {
    if (!input.planId) throw new Error('Plan id is required.');
    await getActivePlan(input.planId);
    const billingInterval = input.billingInterval ?? current.billingInterval;
    updates = { plan_id: input.planId, billing_interval: billingInterval, status: 'active', renewal_at: nextRenewalAt(billingInterval), expires_at: null, cancelled_at: null, cancellation_reason: null };
  } else if (input.action === 'cancel') updates = { status: 'cancelled', cancelled_at: new Date().toISOString() };
  else updates = { status: 'active', cancelled_at: null, cancellation_reason: null, renewal_at: nextRenewalAt(current.billingInterval as 'monthly' | 'yearly') };
  const { data, error } = await supabaseAdmin.from('subscriptions').update(updates).eq('id', current.id).select('*').single();
  if (error || !data) throw new Error(error?.message ?? 'Subscription update failed.');
  await supabaseAdmin.from('subscription_history').insert({ id: `sub-history-${randomUUID()}`, subscription_id: current.id, previous_plan_id: current.plan?.id ?? null, next_plan_id: updates.plan_id ?? current.plan?.id ?? null, previous_status: current.status, next_status: updates.status, change_type: input.action, changed_by: input.userId });
  await supabaseAdmin.from('subscription_events').insert({ id: `sub-event-${randomUUID()}`, subscription_id: current.id, organisation_id: input.organisationId, event_type: input.action, metadata: { planId: updates.plan_id ?? current.plan?.id ?? null } });
  const nextSubscription = await getSubscription(input.organisationId);
  if (nextSubscription) await syncLicenseFromSubscription(input.organisationId, nextSubscription);
  return nextSubscription;
}
