-- Enterprise entitlement, limit, usage, and license foundation. Apply after 008.

create table if not exists entitlement_categories (
  id text primary key, key text not null unique, name text not null, description text not null default '', sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists entitlements (
  id text primary key, category_id text references entitlement_categories(id) on delete set null,
  key text not null unique, name text not null, description text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists plan_entitlements (
  plan_id text not null references plans(id) on delete cascade, entitlement_id text not null references entitlements(id) on delete cascade,
  enabled boolean not null default true, created_at timestamptz not null default now(), primary key(plan_id, entitlement_id)
);
create table if not exists organization_entitlements (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, entitlement_id text not null references entitlements(id) on delete cascade,
  enabled boolean not null, source text not null default 'contract', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(organisation_id, entitlement_id)
);
create table if not exists organization_limits (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, limit_key text not null,
  value_type text not null check(value_type in ('number','unlimited','disabled','custom')), numeric_value numeric, display_value text not null, source text not null default 'contract', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(organisation_id, limit_key)
);
create table if not exists organization_usage (
  organisation_id text not null references organisations(id) on delete cascade, usage_key text not null, quantity numeric not null default 0,
  measured_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(organisation_id, usage_key)
);
create table if not exists usage_events (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, usage_key text not null, delta numeric not null,
  source text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists license_assignments (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, subscription_id text references subscriptions(id) on delete set null,
  status text not null check(status in ('trial','active','paused','cancelled','expired','suspended','grace-period','read-only')),
  starts_at timestamptz not null default now(), expires_at timestamptz, grace_ends_at timestamptz, read_only boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists license_events (
  id text primary key, license_assignment_id text not null references license_assignments(id) on delete cascade, organisation_id text not null references organisations(id) on delete cascade,
  event_type text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

insert into entitlement_categories (id,key,name,sort_order) values
 ('cat-dashboard','dashboard','Dashboards',1),('cat-facility','facility','Facilities',2),('cat-reports','reports','Reports',3),('cat-projects','projects','Projects',4),('cat-documents','documents','Documents',5),('cat-analytics','analytics','Analytics',6),('cat-ai','ai','AI',7),('cat-integration','integration','Integrations',8),('cat-security','security','Security',9),('cat-support','support','Support',10)
on conflict(id) do nothing;
insert into entitlements (id,category_id,key,name) values
 ('ent-dashboard-basic','cat-dashboard','dashboard.basic','Basic Dashboard'),('ent-dashboard-executive','cat-dashboard','dashboard.executive','Executive Dashboard'),('ent-facility-create','cat-facility','facility.create','Create Facilities'),('ent-facility-edit','cat-facility','facility.edit','Edit Facilities'),('ent-facility-delete','cat-facility','facility.delete','Delete Facilities'),('ent-reports-generate','cat-reports','reports.generate','Generate Reports'),('ent-reports-export','cat-reports','reports.export','Export Reports'),('ent-projects-create','cat-projects','projects.create','Create Projects'),('ent-documents-upload','cat-documents','documents.upload','Upload Documents'),('ent-analytics-trends','cat-analytics','analytics.trends','Trends'),('ent-analytics-forecasting','cat-analytics','analytics.forecasting','Forecasting'),('ent-ai-insights','cat-ai','ai.insights','AI Insights'),('ent-integration-api','cat-integration','integration.api','REST API'),('ent-security-audit','cat-security','security.audit_logs','Audit Logs'),('ent-security-sso','cat-security','security.sso','SSO'),('ent-support-priority','cat-support','support.priority','Priority Support'),('ent-support-enterprise','cat-support','support.enterprise','Enterprise Support')
on conflict(id) do nothing;
insert into plan_entitlements(plan_id,entitlement_id)
select p.id,e.id from plans p cross join entitlements e where
 (p.slug='starter' and e.key in ('dashboard.basic','facility.create','facility.edit','reports.generate','documents.upload','analytics.trends')) or
 (p.slug='professional' and e.key in ('dashboard.basic','facility.create','facility.edit','reports.generate','documents.upload','analytics.trends','dashboard.executive','projects.create','ai.insights','integration.api','support.priority')) or
 (p.slug='enterprise' and e.key not in ('security.sso'))
on conflict do nothing;
insert into license_assignments(id,organisation_id,subscription_id,status,starts_at,expires_at,read_only)
select 'lic-' || s.organisation_id, s.organisation_id, s.id, case when s.status='trial' then 'trial' else 'active' end, coalesce(s.started_at,now()), s.expires_at, false from subscriptions s
where s.deleted_at is null and not exists(select 1 from license_assignments l where l.organisation_id=s.organisation_id and l.deleted_at is null);

create index if not exists idx_org_entitlements_org on organization_entitlements(organisation_id) where deleted_at is null;
create index if not exists idx_usage_events_org on usage_events(organisation_id,created_at desc);
create index if not exists idx_license_assignment_org on license_assignments(organisation_id) where deleted_at is null;
drop trigger if exists trg_organization_entitlements_updated_at on organization_entitlements; create trigger trg_organization_entitlements_updated_at before update on organization_entitlements for each row execute function set_updated_at();
drop trigger if exists trg_organization_limits_updated_at on organization_limits; create trigger trg_organization_limits_updated_at before update on organization_limits for each row execute function set_updated_at();
drop trigger if exists trg_organization_usage_updated_at on organization_usage; create trigger trg_organization_usage_updated_at before update on organization_usage for each row execute function set_updated_at();
drop trigger if exists trg_license_assignments_updated_at on license_assignments; create trigger trg_license_assignments_updated_at before update on license_assignments for each row execute function set_updated_at();
