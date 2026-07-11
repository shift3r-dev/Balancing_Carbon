import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from './supabaseClients.js';

export async function getLicense(organisationId: string) {
  const { data, error } = await supabaseAdmin.from('license_assignments').select('*').eq('organisation_id', organisationId).is('deleted_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export function isOperationalLicense(license: any) {
  if (!license) return false;
  if (license.read_only || ['suspended', 'expired', 'read-only'].includes(license.status)) return false;
  return !license.expires_at || new Date(license.expires_at).getTime() >= Date.now();
}

export async function getEntitlements(organisationId: string) {
  const { data: subscription, error: subError } = await supabaseAdmin.from('subscriptions').select('plan_id').eq('organisation_id', organisationId).is('deleted_at', null).in('status',['trial','active','paused','pending','suspended']).limit(1).maybeSingle();
  if (subError) throw new Error(subError.message);
  const [{ data: planRows, error: planError }, { data: overrides, error: overrideError }] = await Promise.all([
    subscription?.plan_id ? supabaseAdmin.from('plan_entitlements').select('enabled, entitlements(key,name,category_id)').eq('plan_id', subscription.plan_id) : Promise.resolve({ data: [], error: null }),
    supabaseAdmin.from('organization_entitlements').select('enabled, entitlements(key,name,category_id)').eq('organisation_id', organisationId).is('deleted_at', null),
  ]);
  if (planError || overrideError) throw new Error(planError?.message ?? overrideError?.message ?? 'Entitlement lookup failed.');
  const values = new Map<string, any>();
  for (const row of planRows ?? []) if ((row as any).entitlements?.key) values.set((row as any).entitlements.key, { ...(row as any).entitlements, enabled: (row as any).enabled, source: 'plan' });
  for (const row of overrides ?? []) if ((row as any).entitlements?.key) values.set((row as any).entitlements.key, { ...(row as any).entitlements, enabled: (row as any).enabled, source: 'contract' });
  return [...values.values()];
}

export async function getLimits(organisationId: string) {
  const { data: subscription } = await supabaseAdmin.from('subscriptions').select('plan_id').eq('organisation_id', organisationId).is('deleted_at', null).in('status',['trial','active','paused','pending','suspended']).limit(1).maybeSingle();
  const [{ data: planLimits }, { data: overrides }] = await Promise.all([
    subscription?.plan_id ? supabaseAdmin.from('plan_limits').select('*').eq('plan_id', subscription.plan_id).is('deleted_at', null) : Promise.resolve({ data: [] }),
    supabaseAdmin.from('organization_limits').select('*').eq('organisation_id', organisationId).is('deleted_at', null),
  ]);
  const values = new Map((planLimits ?? []).map((row: any) => [row.limit_key, { key: row.limit_key, type: row.value_type, maximum: row.numeric_value, displayValue: row.display_value, source: 'plan' }]));
  for (const row of overrides ?? []) values.set((row as any).limit_key, { key: (row as any).limit_key, type: (row as any).value_type, maximum: (row as any).numeric_value, displayValue: (row as any).display_value, source: 'contract' });
  const { data: usage } = await supabaseAdmin.from('organization_usage').select('*').eq('organisation_id', organisationId);
  const usageMap = new Map((usage ?? []).map((row: any) => [row.usage_key, Number(row.quantity)]));
  return [...values.values()].map((limit: any) => ({ ...limit, current: usageMap.get(limit.key) ?? 0, remaining: limit.type === 'number' ? Math.max(0, Number(limit.maximum) - (usageMap.get(limit.key) ?? 0)) : null, percentageUsed: limit.type === 'number' && Number(limit.maximum) > 0 ? Math.min(100, ((usageMap.get(limit.key) ?? 0) / Number(limit.maximum)) * 100) : null }));
}

export async function getEntitlement(organisationId: string, key: string) {
  return (await getEntitlements(organisationId)).find((entitlement) => entitlement.key === key) ?? null;
}

export async function getLimit(organisationId: string, key: string) {
  return (await getLimits(organisationId)).find((limit: any) => limit.key === key) ?? null;
}

export function limitAllows(limit: any, current: number) {
  if (!limit || limit.type === 'unlimited' || limit.type === 'custom') return true;
  if (limit.type === 'disabled') return false;
  return current < Number(limit.maximum ?? 0);
}

export async function recordUsage(organisationId: string, usageKey: string, delta: number, source: string, metadata: Record<string, unknown> = {}) {
  const { error: eventError } = await supabaseAdmin.from('usage_events').insert({ id: `usage-${randomUUID()}`, organisation_id: organisationId, usage_key: usageKey, delta, source, metadata });
  if (eventError) throw new Error(eventError.message);
  const { data: existing } = await supabaseAdmin.from('organization_usage').select('quantity').eq('organisation_id', organisationId).eq('usage_key', usageKey).maybeSingle();
  const { error: usageError } = await supabaseAdmin.from('organization_usage').upsert({ organisation_id: organisationId, usage_key: usageKey, quantity: Number(existing?.quantity ?? 0) + delta, measured_at: new Date().toISOString() });
  if (usageError) throw new Error(usageError.message);
}

export async function syncUsage(organisationId: string, usageKey: string, quantity: number, source = 'system') {
  const { error } = await supabaseAdmin.from('organization_usage').upsert({ organisation_id: organisationId, usage_key: usageKey, quantity, measured_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return { organisationId, usageKey, quantity, source };
}

export async function syncLicenseFromSubscription(organisationId: string, subscription: { id: string; status: string; startedAt?: string | null; expiresAt?: string | null }) {
  const status = subscription.status === 'trial' ? 'trial' : subscription.status === 'suspended' ? 'suspended' : subscription.status === 'expired' ? 'expired' : subscription.status === 'cancelled' ? 'cancelled' : 'active';
  const { error } = await supabaseAdmin.from('license_assignments').upsert({
    id: `lic-${organisationId}`, organisation_id: organisationId, subscription_id: subscription.id, status,
    starts_at: subscription.startedAt ?? new Date().toISOString(), expires_at: subscription.expiresAt ?? null,
    read_only: ['suspended', 'expired'].includes(status),
  }, { onConflict: 'organisation_id' });
  if (error) throw new Error(error.message);
}
