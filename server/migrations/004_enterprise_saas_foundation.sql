-- Phase 1 enterprise SaaS foundation. These tables are intentionally unused by runtime routes.
-- No billing, subscriptions, feature gates, or administration behavior is enabled by this migration.

create table if not exists roles (
  id text primary key,
  name text not null unique,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists permissions (
  id text primary key,
  key text not null unique,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists role_permissions (
  role_id text not null references roles(id) on delete cascade,
  permission_id text not null references permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists organization_members (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id text references roles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, user_id)
);

create table if not exists organization_settings (
  organisation_id text primary key references organisations(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists plans (
  id text primary key,
  name text not null unique,
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists subscriptions (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  plan_id text references plans(id) on delete set null,
  status text not null default 'not-configured',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists feature_flags (
  id text primary key,
  key text not null unique,
  description text not null default '',
  default_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists organization_feature_flags (
  organisation_id text not null references organisations(id) on delete cascade,
  feature_flag_id text not null references feature_flags(id) on delete cascade,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (organisation_id, feature_flag_id)
);

create table if not exists usage_metrics (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  metric_key text not null,
  quantity numeric not null default 0,
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists licenses (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  license_key text not null unique,
  status text not null default 'not-configured',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_org_members_org on organization_members(organisation_id) where deleted_at is null;
create index if not exists idx_org_members_user on organization_members(user_id) where deleted_at is null;
create index if not exists idx_subscriptions_org on subscriptions(organisation_id) where deleted_at is null;
create index if not exists idx_usage_metrics_org_key on usage_metrics(organisation_id, metric_key, measured_at desc) where deleted_at is null;
create index if not exists idx_licenses_org on licenses(organisation_id) where deleted_at is null;

drop trigger if exists trg_roles_updated_at on roles;
create trigger trg_roles_updated_at before update on roles for each row execute function set_updated_at();
drop trigger if exists trg_permissions_updated_at on permissions;
create trigger trg_permissions_updated_at before update on permissions for each row execute function set_updated_at();
drop trigger if exists trg_organization_members_updated_at on organization_members;
create trigger trg_organization_members_updated_at before update on organization_members for each row execute function set_updated_at();
drop trigger if exists trg_organization_settings_updated_at on organization_settings;
create trigger trg_organization_settings_updated_at before update on organization_settings for each row execute function set_updated_at();
drop trigger if exists trg_plans_updated_at on plans;
create trigger trg_plans_updated_at before update on plans for each row execute function set_updated_at();
drop trigger if exists trg_subscriptions_updated_at on subscriptions;
create trigger trg_subscriptions_updated_at before update on subscriptions for each row execute function set_updated_at();
drop trigger if exists trg_feature_flags_updated_at on feature_flags;
create trigger trg_feature_flags_updated_at before update on feature_flags for each row execute function set_updated_at();
drop trigger if exists trg_organization_feature_flags_updated_at on organization_feature_flags;
create trigger trg_organization_feature_flags_updated_at before update on organization_feature_flags for each row execute function set_updated_at();
drop trigger if exists trg_usage_metrics_updated_at on usage_metrics;
create trigger trg_usage_metrics_updated_at before update on usage_metrics for each row execute function set_updated_at();
drop trigger if exists trg_licenses_updated_at on licenses;
create trigger trg_licenses_updated_at before update on licenses for each row execute function set_updated_at();
drop trigger if exists trg_system_settings_updated_at on system_settings;
create trigger trg_system_settings_updated_at before update on system_settings for each row execute function set_updated_at();

alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table organization_members enable row level security;
alter table organization_settings enable row level security;
alter table plans enable row level security;
alter table subscriptions enable row level security;
alter table feature_flags enable row level security;
alter table organization_feature_flags enable row level security;
alter table usage_metrics enable row level security;
alter table licenses enable row level security;
alter table system_settings enable row level security;
