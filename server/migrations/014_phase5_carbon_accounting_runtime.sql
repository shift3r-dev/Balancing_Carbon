-- Phase 5 runtime data. Apply after 010 and before using registry-backed activity APIs.

alter table activity_records add column if not exists legacy_energy_record_id text references energy_records(id) on delete set null;
alter table activity_records add column if not exists scope text check(scope in ('scope-1', 'scope-2'));
alter table calculation_records add column if not exists legacy_energy_record_id text references energy_records(id) on delete set null;

insert into emission_factor_registry (
  id, factor_key, source_type, scope, country, source_name, version, publication_year, effective_from,
  factor_value, factor_unit, activity_unit, reference_url, status
) values
  ('efr-india-grid-2025-v1', 'grid-electricity-india', 'Grid Electricity', 'scope-2', 'India', 'Initial platform factor set - replace with organisation-approved CEA factor before audit use', '2025.1', 2025, '2025-04-01', 0.716, 'kgCO2e/kWh', 'kWh', 'https://cea.nic.in/cdm-co2-baseline-database/?lang=en', 'active'),
  ('efr-india-solar-2025-v1', 'onsite-solar-india', 'On-site Solar', 'scope-2', 'India', 'Initial platform accounting policy - operational factor only', '2025.1', 2025, '2025-04-01', 0, 'kgCO2e/kWh', 'kWh', '', 'active'),
  ('efr-india-wind-2025-v1', 'onsite-wind-india', 'On-site Wind', 'scope-2', 'India', 'Initial platform accounting policy - operational factor only', '2025.1', 2025, '2025-04-01', 0, 'kgCO2e/kWh', 'kWh', '', 'active'),
  ('efr-diesel-2025-v1', 'diesel-combustion', 'Diesel', 'scope-1', 'India', 'Initial platform factor set - replace with organisation-approved factor before audit use', '2025.1', 2025, '2025-04-01', 2.68, 'kgCO2e/litre', 'litre', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', 'active'),
  ('efr-petrol-2025-v1', 'petrol-combustion', 'Petrol', 'scope-1', 'India', 'Initial platform factor set - replace with organisation-approved factor before audit use', '2025.1', 2025, '2025-04-01', 2.31, 'kgCO2e/litre', 'litre', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', 'active'),
  ('efr-lpg-2025-v1', 'lpg-combustion', 'LPG', 'scope-1', 'India', 'Initial platform factor set - replace with organisation-approved factor before audit use', '2025.1', 2025, '2025-04-01', 1.51, 'kgCO2e/litre', 'litre', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', 'active'),
  ('efr-natural-gas-2025-v1', 'natural-gas-combustion', 'Natural Gas', 'scope-1', 'India', 'Initial platform factor set - replace with organisation-approved factor before audit use', '2025.1', 2025, '2025-04-01', 2.02, 'kgCO2e/SCM', 'SCM', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', 'active'),
  ('efr-furnace-oil-2025-v1', 'furnace-oil-combustion', 'Furnace Oil', 'scope-1', 'India', 'Initial platform factor set - replace with organisation-approved factor before audit use', '2025.1', 2025, '2025-04-01', 3.15, 'kgCO2e/litre', 'litre', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', 'active'),
  ('efr-biomass-2025-v1', 'biomass-combustion', 'Biomass', 'scope-1', 'India', 'Initial platform factor set - biogenic treatment requires organisation policy review', '2025.1', 2025, '2025-04-01', 0.05, 'kgCO2e/kg', 'kg', 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol2.html', 'active'),
  ('efr-coal-2025-v1', 'coal-combustion', 'Coal', 'scope-1', 'India', 'Initial platform factor set - replace with organisation-approved factor before audit use', '2025.1', 2025, '2025-04-01', 2.42, 'kgCO2e/kg', 'kg', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', 'active'),
  ('efr-steam-2025-v1', 'purchased-steam', 'Purchased Steam', 'scope-2', 'India', 'Initial platform factor set - supplier-specific factor is preferred', '2025.1', 2025, '2025-04-01', 0.184, 'kgCO2e/kg', 'kg', '', 'active'),
  ('efr-heat-2025-v1', 'purchased-heat', 'Purchased Heat', 'scope-2', 'India', 'Initial platform factor set - supplier-specific factor is preferred', '2025.1', 2025, '2025-04-01', 0.184, 'kgCO2e/kWh', 'kWh', '', 'active')
on conflict (id) do update set
  source_name = excluded.source_name, version = excluded.version, publication_year = excluded.publication_year,
  effective_from = excluded.effective_from, factor_value = excluded.factor_value, factor_unit = excluded.factor_unit,
  activity_unit = excluded.activity_unit, reference_url = excluded.reference_url, status = excluded.status;

create index if not exists idx_activity_records_legacy_energy on activity_records(legacy_energy_record_id) where deleted_at is null;
create index if not exists idx_calculation_records_activity_current on calculation_records(activity_record_id, status) where status = 'current';
