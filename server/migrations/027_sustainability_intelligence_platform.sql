-- Formal Phase 11: Sustainability Intelligence Platform. Apply after 026.

create table if not exists sustainability_targets (
 id text primary key, organisation_id text not null references organisations(id) on delete cascade, facility_id text references facilities(id) on delete set null,
 name text not null, target_type text not null check(target_type in ('absolute-carbon','carbon-intensity','renewable-share','energy-intensity','water-intensity','waste-diversion','net-zero')),
 baseline_year integer not null, target_year integer not null check(target_year>baseline_year), baseline_value numeric not null check(baseline_value>=0), target_value numeric not null check(target_value>=0), current_value numeric check(current_value>=0),
 unit text not null, scopes jsonb not null default '[]'::jsonb, framework text not null default 'internal', status text not null default 'draft' check(status in ('draft','approved','active','achieved','missed','archived')),
 methodology text not null default '', owner text not null default '', created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists net_zero_pathways (
 id text primary key, organisation_id text not null references organisations(id) on delete cascade, name text not null, baseline_year integer not null, target_year integer not null,
 baseline_emissions_t_co2e numeric not null check(baseline_emissions_t_co2e>=0), target_residual_t_co2e numeric not null default 0 check(target_residual_t_co2e>=0 and target_residual_t_co2e<=baseline_emissions_t_co2e), reduction_hierarchy jsonb not null default '["avoid","reduce","replace","neutralize-residual"]'::jsonb,
 assumptions jsonb not null default '{}'::jsonb, status text not null default 'draft' check(status in ('draft','approved','active','archived')), created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists pathway_milestones (
 id text primary key, organisation_id text not null references organisations(id) on delete cascade, pathway_id text not null references net_zero_pathways(id) on delete cascade,
 year integer not null, target_emissions_t_co2e numeric not null, notes text not null default '', status text not null default 'planned' check(status in ('planned','on-track','at-risk','achieved','missed')), unique(pathway_id,year)
);
create table if not exists supplier_sustainability_assessments (
 id text primary key, organisation_id text not null references organisations(id) on delete cascade, supplier_name text not null, category text not null default '', country text not null default '',
 annual_spend numeric check(annual_spend>=0), reported_emissions_t_co2e numeric check(reported_emissions_t_co2e>=0), product_intensity numeric check(product_intensity>=0), intensity_unit text not null default '', renewable_share numeric check(renewable_share between 0 and 100), data_year integer,
 data_quality text not null default 'unknown' check(data_quality in ('unknown','estimated','supplier-reported','third-party-verified')), engagement_status text not null default 'not-contacted' check(engagement_status in ('not-contacted','requested','responded','improvement-plan','verified')),
 evidence_document_id text references documents(id) on delete set null, notes text not null default '', created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organisation_id,supplier_name)
);
create table if not exists sustainability_plan_snapshots (
 id text primary key, organisation_id text not null references organisations(id) on delete cascade, snapshot_type text not null check(snapshot_type in ('planner','macc','target-readiness','esg-score','credit-plan')),
 input_snapshot jsonb not null, result_snapshot jsonb not null, methodology_version text not null, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create index if not exists idx_sustainability_targets_org on sustainability_targets(organisation_id,status);
create index if not exists idx_pathways_org on net_zero_pathways(organisation_id,status);
create index if not exists idx_supplier_sustainability_org on supplier_sustainability_assessments(organisation_id);
drop trigger if exists trg_sustainability_targets_updated_at on sustainability_targets; create trigger trg_sustainability_targets_updated_at before update on sustainability_targets for each row execute function set_updated_at();
drop trigger if exists trg_net_zero_pathways_updated_at on net_zero_pathways; create trigger trg_net_zero_pathways_updated_at before update on net_zero_pathways for each row execute function set_updated_at();
drop trigger if exists trg_supplier_sustainability_updated_at on supplier_sustainability_assessments; create trigger trg_supplier_sustainability_updated_at before update on supplier_sustainability_assessments for each row execute function set_updated_at();
alter table sustainability_targets enable row level security; alter table net_zero_pathways enable row level security; alter table pathway_milestones enable row level security; alter table supplier_sustainability_assessments enable row level security; alter table sustainability_plan_snapshots enable row level security;
insert into permissions(id,key,description) values ('perm-sustainability-view','sustainability.view','View sustainability plans, targets and recommendations'),('perm-sustainability-manage','sustainability.manage','Manage sustainability targets, pathways and supplier assessments') on conflict(id) do update set key=excluded.key,description=excluded.description;
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permissions p where r.id in ('role-super-admin','role-platform-admin','role-organisation-admin','role-sustainability-manager') and p.key in ('sustainability.view','sustainability.manage') on conflict do nothing;
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permissions p where r.id in ('role-plant-manager','role-auditor') and p.key='sustainability.view' on conflict do nothing;
insert into entitlements(id,category_id,key,name,description) values ('ent-sustainability-intelligence','cat-analytics','sustainability.intelligence','Sustainability Intelligence','Targets, net-zero pathways, MACC, suppliers and resource optimization.'),('ent-supplier-intelligence','cat-analytics','sustainability.suppliers','Supplier Sustainability','Supplier data quality, engagement and scoring.') on conflict(id) do update set name=excluded.name,description=excluded.description;
insert into plan_entitlements(plan_id,entitlement_id) select m.plan_id,e.id from (values ('plan-professional','sustainability.intelligence'),('plan-enterprise','sustainability.intelligence'),('plan-enterprise','sustainability.suppliers')) m(plan_id,key) join entitlements e on e.key=m.key on conflict do nothing;
