-- Phase 4: enforceable entitlement and license data. Apply after 009 and 012.

create unique index if not exists idx_license_assignments_organisation_unique on license_assignments(organisation_id);
create index if not exists idx_license_assignments_status on license_assignments(organisation_id, status) where deleted_at is null;

insert into entitlements (id, category_id, key, name, description) values
  ('ent-analytics-benchmarking', 'cat-analytics', 'analytics.benchmarking', 'Benchmarking', 'Compare performance across facilities and reporting periods.'),
  ('ent-analytics-calculation-insights', 'cat-analytics', 'analytics.calculation_insights', 'Calculation Insights', 'Deterministic insights generated from recorded carbon data.'),
  ('ent-compliance-manage', 'cat-reports', 'compliance.manage', 'Compliance Workflows', 'Create and maintain ESG and OEM compliance workflows.')
on conflict (id) do update set name = excluded.name, description = excluded.description;

delete from plan_entitlements where plan_id in ('plan-starter', 'plan-professional', 'plan-enterprise');

insert into plan_entitlements (plan_id, entitlement_id)
select plan_id, entitlement_id from (
  values
    ('plan-starter', 'ent-dashboard-basic'),
    ('plan-starter', 'ent-facility-create'),
    ('plan-starter', 'ent-facility-edit'),
    ('plan-starter', 'ent-facility-delete'),
    ('plan-starter', 'ent-reports-generate'),
    ('plan-starter', 'ent-documents-upload'),
    ('plan-starter', 'ent-analytics-trends'),
    ('plan-professional', 'ent-dashboard-basic'),
    ('plan-professional', 'ent-facility-create'),
    ('plan-professional', 'ent-facility-edit'),
    ('plan-professional', 'ent-facility-delete'),
    ('plan-professional', 'ent-reports-generate'),
    ('plan-professional', 'ent-documents-upload'),
    ('plan-professional', 'ent-analytics-trends'),
    ('plan-professional', 'ent-dashboard-executive'),
    ('plan-professional', 'ent-projects-create'),
    ('plan-professional', 'ent-compliance-manage'),
    ('plan-professional', 'ent-analytics-benchmarking'),
    ('plan-professional', 'ent-analytics-calculation-insights'),
    ('plan-professional', 'ent-support-priority'),
    ('plan-enterprise', 'ent-dashboard-basic'),
    ('plan-enterprise', 'ent-facility-create'),
    ('plan-enterprise', 'ent-facility-edit'),
    ('plan-enterprise', 'ent-facility-delete'),
    ('plan-enterprise', 'ent-reports-generate'),
    ('plan-enterprise', 'ent-documents-upload'),
    ('plan-enterprise', 'ent-analytics-trends'),
    ('plan-enterprise', 'ent-dashboard-executive'),
    ('plan-enterprise', 'ent-projects-create'),
    ('plan-enterprise', 'ent-compliance-manage'),
    ('plan-enterprise', 'ent-analytics-benchmarking'),
    ('plan-enterprise', 'ent-analytics-calculation-insights'),
    ('plan-enterprise', 'ent-security-audit'),
    ('plan-enterprise', 'ent-support-enterprise')
) as mapping(plan_id, entitlement_id)
on conflict do nothing;

insert into license_assignments (id, organisation_id, subscription_id, status, starts_at, expires_at, read_only)
select
  'lic-' || s.organisation_id,
  s.organisation_id,
  s.id,
  case when s.status = 'trial' then 'trial' when s.status in ('suspended', 'expired') then s.status else 'active' end,
  coalesce(s.started_at, now()),
  s.expires_at,
  s.status in ('suspended', 'expired')
from subscriptions s
where s.deleted_at is null
on conflict (organisation_id) do update set
  subscription_id = excluded.subscription_id,
  status = excluded.status,
  expires_at = excluded.expires_at,
  read_only = excluded.read_only;

insert into organization_usage (organisation_id, usage_key, quantity, measured_at)
select organisation_id, 'facilities', count(*), now() from facilities group by organisation_id
on conflict (organisation_id, usage_key) do update set quantity = excluded.quantity, measured_at = excluded.measured_at;

insert into organization_usage (organisation_id, usage_key, quantity, measured_at)
select organisation_id, 'users', count(*), now() from organization_members where deleted_at is null group by organisation_id
on conflict (organisation_id, usage_key) do update set quantity = excluded.quantity, measured_at = excluded.measured_at;

insert into organization_usage (organisation_id, usage_key, quantity, measured_at)
select organisation_id, 'reports_month', count(*), now() from reports where created_at >= date_trunc('month', now()) group by organisation_id
on conflict (organisation_id, usage_key) do update set quantity = excluded.quantity, measured_at = excluded.measured_at;
