-- Enterprise carbon accounting engine. Additive and safe for databases that already ran 010-030.
-- This migration adds no numeric emission factors. Factors must be sourced, versioned and approved separately.

alter table emission_factor_registry drop constraint if exists emission_factor_registry_scope_check;
alter table emission_factor_registry add constraint emission_factor_registry_scope_check check (scope in ('scope-1','scope-2','scope-3'));
alter table emission_factor_registry add column if not exists factor_source text not null default '';
alter table emission_factor_registry add column if not exists factor_family text not null default '';
alter table emission_factor_registry add column if not exists gas text not null default 'CO2e';
alter table emission_factor_registry add column if not exists gwp_basis text not null default '';
alter table emission_factor_registry add column if not exists calculation_method text not null default 'activity-factor';
alter table emission_factor_registry add column if not exists geography_level text not null default 'country';
alter table emission_factor_registry add column if not exists state text not null default '';
alter table emission_factor_registry add column if not exists quality_rating text not null default 'unrated';
alter table emission_factor_registry add column if not exists is_custom boolean not null default false;
alter table emission_factor_registry add column if not exists approval_status text not null default 'approved';
alter table emission_factor_registry add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table emission_factor_registry add column if not exists organisation_id text references organisations(id) on delete cascade;

alter table activity_records drop constraint if exists activity_records_activity_category_check;
alter table activity_records drop constraint if exists activity_records_scope_check;
alter table activity_records add constraint activity_records_scope_check check (scope in ('scope-1','scope-2','scope-3'));
alter table activity_records add column if not exists scope_category text not null default '';
alter table activity_records add column if not exists ghg_category text not null default '';
alter table activity_records add column if not exists calculation_method text not null default 'activity-factor';
alter table activity_records add column if not exists activity_metadata jsonb not null default '{}'::jsonb;
alter table activity_records add column if not exists data_quality_score numeric;
alter table activity_records add column if not exists confidence_score numeric;
alter table activity_records add column if not exists factor_override_reason text not null default '';
alter table activity_records add column if not exists is_manual_override boolean not null default false;
alter table activity_records add column if not exists supplier_id text;
alter table activity_records add column if not exists asset_id text;
alter table activity_records add column if not exists meter_id text;

create table if not exists carbon_activity_source_catalog (
  id text primary key,
  scope text not null check (scope in ('scope-1','scope-2','scope-3')),
  category text not null,
  ghg_category text not null,
  name text not null,
  description text not null default '',
  default_calculation_method text not null default 'activity-factor',
  allowed_units jsonb not null default '[]'::jsonb,
  evidence_hint text not null default '',
  supplier_relevant boolean not null default false,
  status text not null default 'active' check (status in ('active','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table emission_factor_registry add column if not exists source_catalog_id text references carbon_activity_source_catalog(id) on delete set null;

create table if not exists carbon_suppliers (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  name text not null,
  supplier_code text not null default '',
  country text not null default '',
  industry text not null default '',
  contact_email text not null default '',
  portal_status text not null default 'not-invited' check (portal_status in ('not-invited','invited','active','suspended')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, name)
);

create table if not exists carbon_assets (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  facility_id text not null references facilities(id) on delete cascade,
  name text not null,
  asset_code text not null default '',
  asset_type text not null default '',
  fuel_or_refrigerant text not null default '',
  operational_status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, facility_id, name)
);

create table if not exists carbon_meters (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  facility_id text not null references facilities(id) on delete cascade,
  asset_id text references carbon_assets(id) on delete set null,
  name text not null,
  meter_code text not null default '',
  meter_type text not null default '',
  unit text not null default '',
  reading_method text not null default 'manual',
  operational_status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, facility_id, name)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'activity_records_supplier_id_fkey') then
    alter table activity_records add constraint activity_records_supplier_id_fkey foreign key (supplier_id) references carbon_suppliers(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'activity_records_asset_id_fkey') then
    alter table activity_records add constraint activity_records_asset_id_fkey foreign key (asset_id) references carbon_assets(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'activity_records_meter_id_fkey') then
    alter table activity_records add constraint activity_records_meter_id_fkey foreign key (meter_id) references carbon_meters(id) on delete set null;
  end if;
end $$;

create table if not exists carbon_calculation_drafts (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  facility_id text references facilities(id) on delete cascade,
  scope text not null check (scope in ('scope-1','scope-2','scope-3')),
  source_catalog_id text references carbon_activity_source_catalog(id) on delete set null,
  title text not null default '',
  draft_data jsonb not null default '{}'::jsonb,
  last_calculation jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists carbon_approval_events (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  activity_record_id text not null references activity_records(id) on delete cascade,
  from_status text not null default '',
  to_status text not null,
  comment text not null default '',
  acted_by uuid references auth.users(id) on delete set null,
  acted_at timestamptz not null default now()
);

insert into carbon_activity_source_catalog (id, scope, category, ghg_category, name, description, default_calculation_method, allowed_units, evidence_hint, supplier_relevant) values
('s1-stationary-combustion','scope-1','stationary-combustion','Stationary combustion','Stationary combustion','Fuels combusted in boilers, furnaces, generators and other fixed equipment.','activity-factor','["litre","kg","tonne","SCM","Nm3","kWh"]','Fuel invoice, stock ledger or calibrated meter record.',false),
('s1-mobile-combustion','scope-1','mobile-combustion','Mobile combustion','Mobile combustion','Fuel used by owned or controlled vehicles and mobile machinery.','activity-factor','["litre","kg","km","vehicle-km"]','Fuel card, odometer or fleet telematics.',false),
('s1-process-emissions','scope-1','process-emissions','Process emissions','Industrial process emissions','Direct emissions caused by industrial chemistry rather than fuel combustion.','activity-factor','["kg","tonne","m3"]','Production record, mass balance or laboratory result.',false),
('s1-fugitive-emissions','scope-1','fugitive-emissions','Fugitive emissions','Fugitive emissions','Refrigerant and other greenhouse gas releases from equipment and processes.','refrigerant-balance','["kg"]','Charge, service and recovery records.',false),
('s2-purchased-electricity','scope-2','purchased-electricity','Purchased electricity','Purchased electricity','Location-based or market-based purchased electricity.','activity-factor','["kWh","MWh"]','Utility bill, meter export, PPA or certificate.',false),
('s2-purchased-steam','scope-2','purchased-steam','Purchased steam','Purchased steam','Steam supplied by another entity.','activity-factor','["kg","tonne","kWh","MWh"]','Supplier invoice and supplier factor.',false),
('s2-purchased-heat','scope-2','purchased-heat','Purchased heat','Purchased heat','District or supplier-provided heat.','activity-factor','["kWh","MWh","GJ"]','Supplier invoice and supplier factor.',false),
('s2-purchased-cooling','scope-2','purchased-cooling','Purchased cooling','Purchased cooling','District or supplier-provided cooling.','activity-factor','["kWh","MWh","GJ","TRh"]','Supplier invoice and supplier factor.',false),
('s3-01','scope-3','scope3-category-01','Category 1: Purchased goods and services','Purchased goods and services','Cradle-to-gate emissions from purchased materials and services.','supplier-specific','["kg","tonne","INR","USD"]','Supplier PCF, EPD, invoice or purchase ledger.',true),
('s3-02','scope-3','scope3-category-02','Category 2: Capital goods','Capital goods','Cradle-to-gate emissions from purchased capital assets.','spend-factor','["INR","USD","kg","tonne"]','Asset register, invoice and supplier disclosure.',true),
('s3-03','scope-3','scope3-category-03','Category 3: Fuel- and energy-related activities','Fuel- and energy-related activities','Upstream fuel and energy emissions outside Scope 1 and Scope 2.','activity-factor','["kWh","MWh","litre","kg","tonne"]','Energy ledger and upstream factor source.',true),
('s3-04','scope-3','scope3-category-04','Category 4: Upstream transportation and distribution','Upstream transportation and distribution','Third-party inbound freight and warehousing.','distance-factor','["tonne-km","vehicle-km","INR","USD"]','Freight invoice, route and load record.',true),
('s3-05','scope-3','scope3-category-05','Category 5: Waste generated in operations','Waste generated in operations','Third-party treatment and disposal of operational waste.','activity-factor','["kg","tonne"]','Waste manifest and treatment route.',true),
('s3-06','scope-3','scope3-category-06','Category 6: Business travel','Business travel','Employee travel in non-owned transport and accommodation.','distance-factor','["passenger-km","room-night","INR","USD"]','Travel booking and expense record.',true),
('s3-07','scope-3','scope3-category-07','Category 7: Employee commuting','Employee commuting','Travel between employee homes and workplaces.','distance-factor','["passenger-km","vehicle-km"]','Travel survey and attendance data.',true),
('s3-08','scope-3','scope3-category-08','Category 8: Upstream leased assets','Upstream leased assets','Operation of leased assets outside Scope 1 and Scope 2.','activity-factor','["kWh","MWh","litre","kg"]','Lease and utility records.',true),
('s3-09','scope-3','scope3-category-09','Category 9: Downstream transportation and distribution','Downstream transportation and distribution','Third-party outbound freight and warehousing.','distance-factor','["tonne-km","vehicle-km","INR","USD"]','Freight invoice, route and load record.',true),
('s3-10','scope-3','scope3-category-10','Category 10: Processing of sold products','Processing of sold products','Downstream processing of intermediate products.','activity-factor','["kg","tonne","kWh","MWh"]','Customer process data and product quantity.',true),
('s3-11','scope-3','scope3-category-11','Category 11: Use of sold products','Use of sold products','Lifetime customer use emissions from sold products.','activity-factor','["unit","kWh","MWh","litre"]','Sales volume, lifetime and use profile.',true),
('s3-12','scope-3','scope3-category-12','Category 12: End-of-life treatment of sold products','End-of-life treatment of sold products','Treatment of products at end of life.','activity-factor','["kg","tonne","unit"]','Material composition and disposal scenario.',true),
('s3-13','scope-3','scope3-category-13','Category 13: Downstream leased assets','Downstream leased assets','Operation of owned assets leased to others.','activity-factor','["kWh","MWh","litre","kg"]','Lease and tenant utility records.',true),
('s3-14','scope-3','scope3-category-14','Category 14: Franchises','Franchises','Operational emissions from franchises.','activity-factor','["kWh","MWh","litre","kg"]','Franchise activity submissions.',true),
('s3-15','scope-3','scope3-category-15','Category 15: Investments','Investments','Financed emissions associated with investment and lending portfolios.','supplier-specific','["INR","USD","tCO2e"]','Investee emissions and attribution data.',true)
on conflict (id) do update set name = excluded.name, description = excluded.description, default_calculation_method = excluded.default_calculation_method, allowed_units = excluded.allowed_units, evidence_hint = excluded.evidence_hint, supplier_relevant = excluded.supplier_relevant, updated_at = now();

create index if not exists idx_carbon_source_catalog_scope on carbon_activity_source_catalog(scope, category) where status = 'active';
create index if not exists idx_carbon_drafts_org on carbon_calculation_drafts(organisation_id, updated_at desc) where deleted_at is null;
create index if not exists idx_carbon_approvals_activity on carbon_approval_events(activity_record_id, acted_at desc);
create index if not exists idx_carbon_suppliers_org on carbon_suppliers(organisation_id) where deleted_at is null;
create index if not exists idx_carbon_assets_facility on carbon_assets(facility_id) where deleted_at is null;
create index if not exists idx_carbon_meters_facility on carbon_meters(facility_id) where deleted_at is null;

drop trigger if exists trg_carbon_source_catalog_updated_at on carbon_activity_source_catalog;
create trigger trg_carbon_source_catalog_updated_at before update on carbon_activity_source_catalog for each row execute function set_updated_at();
drop trigger if exists trg_carbon_suppliers_updated_at on carbon_suppliers;
create trigger trg_carbon_suppliers_updated_at before update on carbon_suppliers for each row execute function set_updated_at();
drop trigger if exists trg_carbon_assets_updated_at on carbon_assets;
create trigger trg_carbon_assets_updated_at before update on carbon_assets for each row execute function set_updated_at();
drop trigger if exists trg_carbon_meters_updated_at on carbon_meters;
create trigger trg_carbon_meters_updated_at before update on carbon_meters for each row execute function set_updated_at();
drop trigger if exists trg_carbon_drafts_updated_at on carbon_calculation_drafts;
create trigger trg_carbon_drafts_updated_at before update on carbon_calculation_drafts for each row execute function set_updated_at();

alter table carbon_activity_source_catalog enable row level security;
alter table carbon_suppliers enable row level security;
alter table carbon_assets enable row level security;
alter table carbon_meters enable row level security;
alter table carbon_calculation_drafts enable row level security;
alter table carbon_approval_events enable row level security;
