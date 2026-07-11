-- Phase 7 compatibility repair: preserve the legacy factor FK and add the current registry FK.
-- Apply after 020.

alter table energy_records add column if not exists registry_emission_factor_id text references emission_factor_registry(id) on delete set null;

update energy_records e
set registry_emission_factor_id = coalesce(nullif(e.calculation_metadata ->> 'emissionFactorId', ''), nullif(e.audit_trail ->> 'emissionFactorId', ''))
where e.registry_emission_factor_id is null
  and exists (
    select 1 from emission_factor_registry r
    where r.id = coalesce(nullif(e.calculation_metadata ->> 'emissionFactorId', ''), nullif(e.audit_trail ->> 'emissionFactorId', ''))
  );

create index if not exists idx_energy_records_registry_factor on energy_records(registry_emission_factor_id);
