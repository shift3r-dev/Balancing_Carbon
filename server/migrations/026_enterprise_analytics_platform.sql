-- Formal Phase 10: Enterprise Analytics Platform.
-- Apply after 025. Additive and safe to rerun.

create table if not exists analytics_datasets (
  id text primary key, key text not null unique, name text not null, description text not null default '',
  grain text not null, dimensions jsonb not null default '[]'::jsonb, measures jsonb not null default '[]'::jsonb,
  status text not null default 'active' check(status in ('draft','active','deprecated')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists analytics_kpi_definitions (
  id text primary key, organisation_id text references organisations(id) on delete cascade, dataset_id text not null references analytics_datasets(id) on delete restrict,
  key text not null, name text not null, description text not null default '', category text not null default 'Carbon',
  formula text not null, unit text not null default '', format text not null default 'number' check(format in ('number','decimal','percent','currency')),
  direction text not null default 'neutral' check(direction in ('higher-better','lower-better','neutral')),
  is_system boolean not null default false, status text not null default 'active' check(status in ('draft','active','archived')),
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organisation_id,key)
);
create unique index if not exists idx_analytics_system_kpi_key on analytics_kpi_definitions(key) where organisation_id is null;
create table if not exists analytics_dashboards (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, owner_user_id uuid references auth.users(id) on delete set null,
  name text not null, description text not null default '', dashboard_type text not null default 'custom' check(dashboard_type in ('executive','operational','facility','custom')),
  visibility text not null default 'private' check(visibility in ('private','organisation')), is_default boolean not null default false,
  filters jsonb not null default '{}'::jsonb, status text not null default 'draft' check(status in ('draft','published','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists analytics_widgets (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, dashboard_id text not null references analytics_dashboards(id) on delete cascade,
  title text not null, widget_type text not null check(widget_type in ('kpi','line','bar','stacked-bar','donut','table','heatmap','map','insight')),
  kpi_key text not null default '', dimension text not null default '', configuration jsonb not null default '{}'::jsonb,
  grid_x integer not null default 0, grid_y integer not null default 0, grid_w integer not null default 4 check(grid_w between 2 and 12), grid_h integer not null default 3 check(grid_h between 2 and 12),
  position integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(dashboard_id,position)
);
create table if not exists analytics_saved_views (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, filters jsonb not null default '{}'::jsonb, is_default boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organisation_id,user_id,name)
);
create table if not exists analytics_bookmarks (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  dashboard_id text not null references analytics_dashboards(id) on delete cascade, name text not null, state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), unique(user_id,dashboard_id,name)
);
create table if not exists analytics_exports (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, dashboard_id text references analytics_dashboards(id) on delete set null,
  format text not null check(format in ('csv','json')), filters jsonb not null default '{}'::jsonb, exported_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_dashboards_org on analytics_dashboards(organisation_id,status) where deleted_at is null;
create index if not exists idx_analytics_widgets_dashboard on analytics_widgets(organisation_id,dashboard_id,position);
create index if not exists idx_analytics_views_owner on analytics_saved_views(organisation_id,user_id);
drop trigger if exists trg_analytics_datasets_updated_at on analytics_datasets; create trigger trg_analytics_datasets_updated_at before update on analytics_datasets for each row execute function set_updated_at();
drop trigger if exists trg_analytics_kpis_updated_at on analytics_kpi_definitions; create trigger trg_analytics_kpis_updated_at before update on analytics_kpi_definitions for each row execute function set_updated_at();
drop trigger if exists trg_analytics_dashboards_updated_at on analytics_dashboards; create trigger trg_analytics_dashboards_updated_at before update on analytics_dashboards for each row execute function set_updated_at();
drop trigger if exists trg_analytics_widgets_updated_at on analytics_widgets; create trigger trg_analytics_widgets_updated_at before update on analytics_widgets for each row execute function set_updated_at();
drop trigger if exists trg_analytics_views_updated_at on analytics_saved_views; create trigger trg_analytics_views_updated_at before update on analytics_saved_views for each row execute function set_updated_at();

alter table analytics_datasets enable row level security; alter table analytics_kpi_definitions enable row level security; alter table analytics_dashboards enable row level security;
alter table analytics_widgets enable row level security; alter table analytics_saved_views enable row level security; alter table analytics_bookmarks enable row level security; alter table analytics_exports enable row level security;

insert into analytics_datasets(id,key,name,description,grain,dimensions,measures) values
('analytics-dataset-carbon-ledger','carbon-ledger','Carbon ledger','Current calculation records with activity, facility, source, scope and period lineage.','calculation record','["month","facility","scope","source"]'::jsonb,'["emissions_tco2e","activity_quantity"]'::jsonb)
on conflict(id) do update set name=excluded.name,description=excluded.description,dimensions=excluded.dimensions,measures=excluded.measures,status='active';

insert into analytics_kpi_definitions(id,organisation_id,dataset_id,key,name,description,category,formula,unit,format,direction,is_system,status) values
('analytics-kpi-total',null,'analytics-dataset-carbon-ledger','emissions_total','Total emissions','Current Scope 1 and Scope 2 footprint.','Carbon','emissions_total','tCO2e','decimal','lower-better',true,'active'),
('analytics-kpi-scope1',null,'analytics-dataset-carbon-ledger','scope1_total','Scope 1','Direct emissions.','Carbon','scope1_total','tCO2e','decimal','lower-better',true,'active'),
('analytics-kpi-scope2',null,'analytics-dataset-carbon-ledger','scope2_total','Scope 2','Purchased-energy emissions.','Carbon','scope2_total','tCO2e','decimal','lower-better',true,'active'),
('analytics-kpi-production',null,'analytics-dataset-carbon-ledger','production_total','Production output','Compatible tonne-based production output.','Operations','production_total','tonnes','decimal','neutral',true,'active'),
('analytics-kpi-intensity',null,'analytics-dataset-carbon-ledger','carbon_intensity','Carbon intensity','Total emissions per tonne output.','Carbon','emissions_total * 1000 / production_total','kgCO2e/t','decimal','lower-better',true,'active'),
('analytics-kpi-renewable',null,'analytics-dataset-carbon-ledger','renewable_share','Renewable share','Renewable activity quantity as share of Scope 2 energy quantity.','Energy','renewable_quantity * 100 / scope2_quantity','%','percent','higher-better',true,'active'),
('analytics-kpi-evidence',null,'analytics-dataset-carbon-ledger','evidence_coverage','Evidence coverage','Activities with linked evidence as a share of activities.','Quality','activities_with_evidence * 100 / activity_count','%','percent','higher-better',true,'active'),
('analytics-kpi-approval',null,'analytics-dataset-carbon-ledger','approved_coverage','Approved coverage','Approved activities as a share of activities.','Quality','approved_activity_count * 100 / activity_count','%','percent','higher-better',true,'active')
on conflict(id) do update set name=excluded.name,description=excluded.description,formula=excluded.formula,unit=excluded.unit,format=excluded.format,status='active';

insert into permissions(id,key,description) values
('perm-analytics-view','analytics.view','View governed analytics datasets, KPIs and dashboards'),
('perm-analytics-edit','analytics.edit','Create and edit analytics dashboards, widgets and KPI formulas')
on conflict(id) do update set key=excluded.key,description=excluded.description;
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p where r.id in ('role-super-admin','role-platform-admin','role-organisation-admin','role-sustainability-manager') and p.key in ('analytics.view','analytics.edit') on conflict do nothing;
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p where r.id in ('role-plant-manager','role-operator','role-auditor') and p.key='analytics.view' on conflict do nothing;

insert into entitlements(id,category_id,key,name,description) values
('ent-analytics-studio','cat-analytics','analytics.studio','Analytics Studio','Create governed KPI dashboards, filters, drill-through and saved views.'),
('ent-analytics-forecasting','cat-analytics','analytics.forecasting','Analytics forecasting','Transparent trend projection and scenario comparison foundations.')
on conflict(id) do update set name=excluded.name,description=excluded.description;
insert into plan_entitlements(plan_id,entitlement_id)
select mapping.plan_id,entitlement.id from (values ('plan-professional','analytics.studio'),('plan-enterprise','analytics.studio'),('plan-enterprise','analytics.forecasting')) mapping(plan_id,entitlement_key)
join entitlements entitlement on entitlement.key=mapping.entitlement_key on conflict do nothing;
