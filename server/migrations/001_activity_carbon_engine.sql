-- Balancing Carbon activity-record carbon engine migration
-- Safe to review and run manually in Supabase SQL Editor.
-- This migration preserves existing data and does not fabricate monthly records.

-- 1. Emission factor registry. Seed prototype factors separately after review.
create table if not exists emission_factors (
  id text primary key,
  source_type text not null,
  display_name text not null,
  scope text not null check (scope in ('scope-1', 'scope-2')),
  factor_value numeric not null,
  factor_unit text not null,
  activity_unit text not null,
  compatible_units text[] not null default '{}',
  geography text default 'India',
  reporting_year text,
  methodology text,
  source_name text not null,
  source_reference text,
  version text not null default '1.0',
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz default now()
);

insert into emission_factors (
  id, source_type, display_name, scope, factor_value, factor_unit, activity_unit,
  compatible_units, geography, reporting_year, methodology, source_name,
  source_reference, version, valid_from, is_active, notes
) values
  (
    'ef-grid-electricity-india-2025-prototype', 'Grid Electricity', 'Grid electricity, location-based',
    'scope-2', 0.716, 'kgCO2e/kWh', 'kWh', array['kWh'], 'India', '2025',
    'Scope 2 location-based electricity emissions',
    'Prototype factor - replace with authoritative source before audit use',
    'Prototype registry seeded by Balancing Carbon migration', '1.0', '2025-04-01', true,
    'Prototype grid factor retained for product testing; do not present as audit-grade.'
  ),
  (
    'ef-solar-electricity-india-2025-prototype', 'Solar Electricity', 'On-site solar electricity',
    'scope-2', 0, 'kgCO2e/kWh', 'kWh', array['kWh'], 'India', '2025',
    'Zero direct operational emissions for on-site renewable generation',
    'Prototype factor - replace with documented accounting policy before audit use',
    'Prototype registry seeded by Balancing Carbon migration', '1.0', '2025-04-01', true,
    'This is not market-based Scope 2 accounting and does not model certificates or residual mix.'
  ),
  (
    'ef-wind-electricity-india-2025-prototype', 'Wind Electricity', 'Wind electricity',
    'scope-2', 0, 'kgCO2e/kWh', 'kWh', array['kWh'], 'India', '2025',
    'Zero direct operational emissions for renewable generation',
    'Prototype factor - replace with documented accounting policy before audit use',
    'Prototype registry seeded by Balancing Carbon migration', '1.0', '2025-04-01', true,
    'This is not market-based Scope 2 accounting and does not model certificates or residual mix.'
  ),
  (
    'ef-diesel-india-2025-prototype', 'Diesel', 'Diesel combustion',
    'scope-1', 2.68, 'kgCO2e/litre', 'litre', array['litre'], 'India', '2025',
    'Combustion emission factor',
    'Prototype factor - replace with authoritative source before audit use',
    'Prototype registry seeded by Balancing Carbon migration', '1.0', '2025-04-01', true,
    'Prototype factor retained for continuity with existing demo data.'
  ),
  (
    'ef-petrol-india-2025-prototype', 'Petrol', 'Petrol combustion',
    'scope-1', 2.31, 'kgCO2e/litre', 'litre', array['litre'], 'India', '2025',
    'Combustion emission factor',
    'Prototype factor - replace with authoritative source before audit use',
    'Prototype registry seeded by Balancing Carbon migration', '1.0', '2025-04-01', true,
    'Prototype factor retained for continuity with existing demo data.'
  ),
  (
    'ef-lpg-india-2025-prototype', 'LPG', 'LPG combustion',
    'scope-1', 1.51, 'kgCO2e/litre', 'litre', array['litre'], 'India', '2025',
    'Combustion emission factor',
    'Prototype factor - replace with authoritative source before audit use',
    'Prototype registry seeded by Balancing Carbon migration', '1.0', '2025-04-01', true,
    'Prototype factor chosen to match existing product test expectations.'
  ),
  (
    'ef-natural-gas-india-2025-prototype', 'Natural Gas', 'Natural gas combustion',
    'scope-1', 2.02, 'kgCO2e/SCM', 'SCM', array['SCM'], 'India', '2025',
    'Combustion emission factor',
    'Prototype factor - replace with authoritative source before audit use',
    'Prototype registry seeded by Balancing Carbon migration', '1.0', '2025-04-01', true,
    'SCM and m3 are treated as compatible aliases in application code.'
  ),
  (
    'ef-furnace-oil-india-2025-prototype', 'Furnace Oil', 'Furnace oil combustion',
    'scope-1', 3.15, 'kgCO2e/litre', 'litre', array['litre'], 'India', '2025',
    'Combustion emission factor',
    'Prototype factor - replace with authoritative source before audit use',
    'Prototype registry seeded by Balancing Carbon migration', '1.0', '2025-04-01', true,
    'Prototype factor retained for continuity with existing demo data.'
  ),
  (
    'ef-biomass-india-2025-prototype', 'Biomass', 'Biomass combustion component',
    'scope-1', 0.05, 'kgCO2e/kg', 'kg', array['kg'], 'India', '2025',
    'Prototype biogenic emissions component',
    'Prototype factor - replace with authoritative source before audit use',
    'Prototype registry seeded by Balancing Carbon migration', '1.0', '2025-04-01', true,
    'Prototype factor retained for continuity with existing demo data.'
  ),
  (
    'ef-coal-india-2025-prototype', 'Coal', 'Coal combustion',
    'scope-1', 2.42, 'kgCO2e/kg', 'kg', array['kg'], 'India', '2025',
    'Combustion emission factor',
    'Prototype factor - replace with authoritative source before audit use',
    'Prototype registry seeded by Balancing Carbon migration', '1.0', '2025-04-01', true,
    'Prototype factor for architecture support only.'
  ),
  (
    'ef-purchased-steam-india-2025-prototype', 'Purchased Steam', 'Purchased steam',
    'scope-2', 0.184, 'kgCO2e/kg', 'kg', array['kg'], 'India', '2025',
    'Purchased energy prototype factor',
    'Prototype factor - replace with supplier-specific source before audit use',
    'Prototype registry seeded by Balancing Carbon migration', '1.0', '2025-04-01', true,
    'Prototype only; supplier-specific steam factors are required for real reporting.'
  ),
  (
    'ef-purchased-heat-india-2025-prototype', 'Purchased Heat', 'Purchased heat',
    'scope-2', 0.184, 'kgCO2e/kWh', 'kWh', array['kWh'], 'India', '2025',
    'Purchased energy prototype factor',
    'Prototype factor - replace with supplier-specific source before audit use',
    'Prototype registry seeded by Balancing Carbon migration', '1.0', '2025-04-01', true,
    'Prototype only; supplier-specific heat factors are required for real reporting.'
  ),
  (
    'ef-other-fuel-india-2025-prototype', 'Other Fuel', 'Other direct fuel',
    'scope-1', 1, 'kgCO2e/unit', 'unit', array['unit'], 'India', '2025',
    'Placeholder fuel factor',
    'Prototype factor - replace before use',
    'Prototype registry seeded by Balancing Carbon migration', '1.0', '2025-04-01', true,
    'Placeholder only. Do not use for audit reporting.'
  )
on conflict (id) do update set
  source_type = excluded.source_type,
  display_name = excluded.display_name,
  scope = excluded.scope,
  factor_value = excluded.factor_value,
  factor_unit = excluded.factor_unit,
  activity_unit = excluded.activity_unit,
  compatible_units = excluded.compatible_units,
  source_name = excluded.source_name,
  notes = excluded.notes,
  is_active = excluded.is_active;

-- 2. Extend existing energy_records into activity records.
alter table energy_records
  add column if not exists activity_type text,
  add column if not exists source_type text,
  add column if not exists scope text check (scope in ('scope-1', 'scope-2')),
  add column if not exists emission_factor_id text references emission_factors(id),
  add column if not exists emission_factor_value numeric,
  add column if not exists emission_factor_unit text,
  add column if not exists emissions_kg_co2e numeric,
  add column if not exists emissions_t_co2e numeric,
  add column if not exists calculation_metadata jsonb default '{}'::jsonb;

-- 3. Backfill only unambiguous legacy columns without changing legacy values.
update energy_records
set
  source_type = coalesce(source_type, energy_type),
  emissions_t_co2e = coalesce(emissions_t_co2e, emissions),
  emissions_kg_co2e = coalesce(emissions_kg_co2e, emissions * 1000),
  calculation_metadata = case
    when calculation_metadata is null or calculation_metadata = '{}'::jsonb
      then coalesce(audit_trail, '{}'::jsonb)
    else calculation_metadata
  end
where source_type is null
   or emissions_t_co2e is null
   or emissions_kg_co2e is null
   or calculation_metadata is null
   or calculation_metadata = '{}'::jsonb;

update energy_records
set activity_type = case
  when lower(coalesce(source_type, energy_type, '')) like '%solar%' then 'renewable-electricity'
  when lower(coalesce(source_type, energy_type, '')) like '%renewable%' then 'renewable-electricity'
  when lower(coalesce(source_type, energy_type, '')) like '%wind%' then 'renewable-electricity'
  when lower(coalesce(source_type, energy_type, '')) like '%electricity%' then 'electricity'
  when lower(coalesce(source_type, energy_type, '')) in ('diesel', 'petrol', 'lpg', 'natural gas', 'furnace oil', 'coal', 'biomass') then 'fuel'
  else 'other'
end
where activity_type is null;

update energy_records
set scope = case
  when lower(coalesce(source_type, energy_type, '')) like '%electricity%' then 'scope-2'
  when lower(coalesce(source_type, energy_type, '')) like '%solar%' then 'scope-2'
  when lower(coalesce(source_type, energy_type, '')) like '%renewable%' then 'scope-2'
  when lower(coalesce(source_type, energy_type, '')) like '%wind%' then 'scope-2'
  else 'scope-1'
end
where scope is null;

-- 4. Optional production records for future period-specific intensity.
create table if not exists production_records (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  facility_id text not null references facilities(id) on delete cascade,
  date date not null,
  reporting_period text,
  quantity numeric not null check (quantity >= 0),
  unit text not null,
  source_document text,
  notes text,
  created_at timestamptz default now()
);

-- 5. Explicitly mark legacy facility totals as cached aggregates.
alter table facilities
  add column if not exists aggregate_source text default 'legacy_or_activity_cache',
  add column if not exists aggregate_updated_at timestamptz;

-- 6. Indexes for tenant-safe filtering and aggregation.
create index if not exists idx_energy_records_org_facility on energy_records(organisation_id, facility_id);
create index if not exists idx_energy_records_org_scope on energy_records(organisation_id, scope);
create index if not exists idx_energy_records_org_source on energy_records(organisation_id, source_type);
create index if not exists idx_energy_records_org_period on energy_records(organisation_id, reporting_period);
create index if not exists idx_energy_records_date on energy_records(date);
create index if not exists idx_production_records_org_facility on production_records(organisation_id, facility_id);
create index if not exists idx_emission_factors_source_active on emission_factors(source_type, is_active);

-- Rollback consideration:
-- To roll back, drop production_records/emission_factors only after removing
-- energy_records.emission_factor_id references, then drop the added nullable
-- columns. Existing legacy columns are untouched by this migration.
