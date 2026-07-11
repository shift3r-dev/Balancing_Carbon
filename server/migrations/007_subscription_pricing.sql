-- Phase 3: database-driven pricing and subscription architecture. No payments or feature enforcement.
-- Fresh projects should run 008_plan_feature_inheritance.sql after this migration.

alter table plans add column if not exists slug text;
alter table plans add column if not exists monthly_price numeric not null default 0;
alter table plans add column if not exists yearly_price numeric not null default 0;
alter table plans add column if not exists currency text not null default 'USD';
alter table plans add column if not exists trial_days integer not null default 14;
alter table plans add column if not exists recommended boolean not null default false;
alter table plans add column if not exists badge text not null default '';
alter table plans add column if not exists active boolean not null default true;
alter table plans add column if not exists sort_order integer not null default 0;
create unique index if not exists idx_plans_slug on plans(slug) where deleted_at is null;

alter table subscriptions add column if not exists billing_interval text not null default 'monthly';
alter table subscriptions add column if not exists trial_ends_at timestamptz;
alter table subscriptions add column if not exists renewal_at timestamptz;
alter table subscriptions add column if not exists expires_at timestamptz;
alter table subscriptions add column if not exists cancelled_at timestamptz;
alter table subscriptions add column if not exists cancellation_reason text;
alter table subscriptions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table subscriptions drop constraint if exists subscriptions_status_check;
alter table subscriptions add constraint subscriptions_status_check check (status in ('trial', 'active', 'paused', 'cancelled', 'expired', 'suspended', 'pending', 'not-configured'));
create unique index if not exists idx_subscriptions_one_live_per_org on subscriptions(organisation_id) where deleted_at is null and status in ('trial', 'active', 'paused', 'pending', 'suspended');

create table if not exists plan_features (
  id text primary key, plan_id text not null references plans(id) on delete cascade,
  feature_key text not null, label text not null, category text not null,
  availability text not null default 'included' check (availability in ('included', 'not-included', 'enterprise-only', 'coming-soon', 'custom')),
  sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(plan_id, feature_key)
);

create table if not exists plan_limits (
  id text primary key, plan_id text not null references plans(id) on delete cascade,
  limit_key text not null, value_type text not null check (value_type in ('number', 'unlimited', 'custom')),
  numeric_value numeric, display_value text not null, unit text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(plan_id, limit_key), check ((value_type = 'number' and numeric_value is not null) or (value_type <> 'number' and numeric_value is null))
);

create table if not exists subscription_history (
  id text primary key, subscription_id text not null references subscriptions(id) on delete cascade,
  previous_plan_id text references plans(id) on delete set null, next_plan_id text references plans(id) on delete set null,
  previous_status text, next_status text, change_type text not null, changed_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists subscription_events (
  id text primary key, subscription_id text not null references subscriptions(id) on delete cascade,
  organisation_id text not null references organisations(id) on delete cascade, event_type text not null,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists future_invoices (
  id text primary key, subscription_id text references subscriptions(id) on delete set null, organisation_id text not null references organisations(id) on delete cascade,
  status text not null default 'not-issued', amount numeric, currency text not null default 'USD', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists future_discounts (
  id text primary key, code text not null unique, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists future_coupons (
  id text primary key, code text not null unique, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

insert into plans (id, name, slug, description, monthly_price, yearly_price, currency, trial_days, recommended, badge, active, sort_order) values
  ('plan-starter', 'Starter', 'starter', 'Essential carbon accounting for a single organisation.', 4999, 49990, 'INR', 14, false, '', true, 1),
  ('plan-professional', 'Professional', 'professional', 'Carbon operations and compliance for growing teams.', 14999, 149990, 'INR', 14, true, 'Most Popular', true, 2),
  ('plan-enterprise', 'Enterprise', 'enterprise', 'Governance and scale for complex carbon programmes.', 49999, 499990, 'INR', 14, false, '', true, 3)
on conflict (id) do update set name=excluded.name, slug=excluded.slug, description=excluded.description, monthly_price=excluded.monthly_price, yearly_price=excluded.yearly_price, currency=excluded.currency, trial_days=excluded.trial_days, recommended=excluded.recommended, badge=excluded.badge, active=excluded.active, sort_order=excluded.sort_order;

insert into plan_limits (id, plan_id, limit_key, value_type, numeric_value, display_value, unit) values
  ('limit-starter-orgs','plan-starter','organizations','number',1,'1','organization'), ('limit-starter-facilities','plan-starter','facilities','number',3,'3','facilities'), ('limit-starter-users','plan-starter','users','number',5,'5','users'), ('limit-starter-storage','plan-starter','storage_gb','number',5,'5 GB','storage'), ('limit-starter-reports','plan-starter','reports_month','number',10,'10','reports/month'), ('limit-starter-api','plan-starter','api_calls_day','number',0,'0','calls/day'),
  ('limit-pro-orgs','plan-professional','organizations','number',1,'1','organization'), ('limit-pro-facilities','plan-professional','facilities','unlimited',null,'Unlimited','facilities'), ('limit-pro-users','plan-professional','users','number',25,'25','users'), ('limit-pro-storage','plan-professional','storage_gb','number',100,'100 GB','storage'), ('limit-pro-reports','plan-professional','reports_month','unlimited',null,'Unlimited','reports'), ('limit-pro-api','plan-professional','api_calls_day','number',50000,'50,000','calls/day'),
  ('limit-enterprise-orgs','plan-enterprise','organizations','number',1,'1','organization'), ('limit-enterprise-facilities','plan-enterprise','facilities','unlimited',null,'Unlimited','facilities'), ('limit-enterprise-users','plan-enterprise','users','unlimited',null,'Unlimited','users'), ('limit-enterprise-storage','plan-enterprise','storage_gb','number',1024,'1 TB','storage'), ('limit-enterprise-reports','plan-enterprise','reports_month','unlimited',null,'Unlimited','reports'), ('limit-enterprise-api','plan-enterprise','api_calls_day','unlimited',null,'Unlimited','calls')
on conflict (plan_id, limit_key) do update set value_type=excluded.value_type, numeric_value=excluded.numeric_value, display_value=excluded.display_value, unit=excluded.unit;

insert into plan_features (id, plan_id, feature_key, label, category, availability, sort_order)
select 'feature-' || plan_id || '-' || feature_key, plan_id, feature_key, label, category, availability, sort_order from (values
 ('plan-starter','scope_1','Scope 1','Carbon Accounting','included',1), ('plan-starter','scope_2','Scope 2','Carbon Accounting','included',2), ('plan-starter','basic_dashboard','Basic Dashboard','Analytics','included',3), ('plan-starter','carbon_calculations','Carbon Calculations','Carbon Accounting','included',4), ('plan-starter','facility_management','Facility Management','Facilities','included',5), ('plan-starter','basic_reports','Basic Reports','Reports','included',6), ('plan-starter','document_upload','Document Upload','Documents','included',7), ('plan-starter','email_support','Email Support','Support','included',8),
 ('plan-professional','advanced_dashboard','Advanced Dashboard','Analytics','included',1), ('plan-professional','calculation_insights','Calculation Insights','Analytics','included',2), ('plan-professional','carbon_intelligence','Carbon Intelligence','Carbon Accounting','included',3), ('plan-professional','benchmarking','Benchmarking','Analytics','included',4), ('plan-professional','projects','Projects','Projects','included',5), ('plan-professional','compliance','Compliance','Compliance','included',6), ('plan-professional','rest_api','REST API','Integrations','coming-soon',7), ('plan-professional','priority_support','Priority Support','Support','coming-soon',8),
 ('plan-enterprise','custom_roles','Custom Roles','Security','included',1), ('plan-enterprise','erp_integrations','ERP Integrations','Integrations','coming-soon',2), ('plan-enterprise','sso','SSO','Security','coming-soon',3), ('plan-enterprise','scim','SCIM','Security','coming-soon',4), ('plan-enterprise','audit_logs','Audit Logs','Security','included',5), ('plan-enterprise','advanced_analytics','Advanced Analytics','Analytics','included',6), ('plan-enterprise','forecasting','Forecasting','Analytics','coming-soon',7), ('plan-enterprise','white_label','White Label','Administration','coming-soon',8), ('plan-enterprise','success_manager','Dedicated Success Manager','Support','coming-soon',9)
) as seeded(plan_id, feature_key, label, category, availability, sort_order)
on conflict (plan_id, feature_key) do update set label=excluded.label, category=excluded.category, availability=excluded.availability, sort_order=excluded.sort_order;

insert into subscriptions (id, organisation_id, plan_id, status, billing_interval, started_at, trial_ends_at, metadata)
select 'sub-starter-' || o.id, o.id, 'plan-starter', 'active', 'monthly', now(), now() + interval '14 days', jsonb_build_object('source','phase_3_backfill') from organisations o
where not exists (select 1 from subscriptions s where s.organisation_id=o.id and s.deleted_at is null and s.status in ('trial','active','paused','pending','suspended'));

create index if not exists idx_plan_features_plan on plan_features(plan_id) where deleted_at is null;
create index if not exists idx_plan_limits_plan on plan_limits(plan_id) where deleted_at is null;
create index if not exists idx_subscription_events_org on subscription_events(organisation_id, created_at desc);
drop trigger if exists trg_plan_features_updated_at on plan_features; create trigger trg_plan_features_updated_at before update on plan_features for each row execute function set_updated_at();
drop trigger if exists trg_plan_limits_updated_at on plan_limits; create trigger trg_plan_limits_updated_at before update on plan_limits for each row execute function set_updated_at();
drop trigger if exists trg_future_invoices_updated_at on future_invoices; create trigger trg_future_invoices_updated_at before update on future_invoices for each row execute function set_updated_at();
drop trigger if exists trg_future_discounts_updated_at on future_discounts; create trigger trg_future_discounts_updated_at before update on future_discounts for each row execute function set_updated_at();
drop trigger if exists trg_future_coupons_updated_at on future_coupons; create trigger trg_future_coupons_updated_at before update on future_coupons for each row execute function set_updated_at();
alter table plan_features enable row level security; alter table plan_limits enable row level security; alter table subscription_history enable row level security; alter table subscription_events enable row level security; alter table future_invoices enable row level security; alter table future_discounts enable row level security; alter table future_coupons enable row level security;
