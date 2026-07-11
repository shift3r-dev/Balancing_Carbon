-- Phase 7 continuation: operational ledgers for non-carbon environmental imports.
-- Apply after 019. Additive and safe to rerun.

create table if not exists water_records (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, facility_id text not null references facilities(id) on delete cascade,
  date date not null, reporting_period text not null default '', flow_type text not null, source text not null default '', destination text not null default '',
  quantity numeric not null check(quantity >= 0), unit text not null, input_quantity numeric not null, input_unit text not null,
  canonical_quantity numeric not null, canonical_unit text not null, conversion_factor numeric not null default 1, conversion_path jsonb not null default '[]'::jsonb,
  quality_parameter text not null default '', source_document text not null default '', notes text not null default '', staged_record_id text unique references ingested_records(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists waste_records (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, facility_id text not null references facilities(id) on delete cascade,
  date date not null, reporting_period text not null default '', waste_type text not null, disposal_method text not null default '', recovery_method text not null default '', vendor text not null default '',
  quantity numeric not null check(quantity >= 0), unit text not null, input_quantity numeric not null, input_unit text not null,
  canonical_quantity numeric not null, canonical_unit text not null, conversion_factor numeric not null default 1, conversion_path jsonb not null default '[]'::jsonb,
  source_document text not null default '', notes text not null default '', staged_record_id text unique references ingested_records(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists material_records (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, facility_id text not null references facilities(id) on delete cascade,
  date date not null, reporting_period text not null default '', material text not null, supplier text not null default '', batch text not null default '', origin text not null default '', recycled_content numeric,
  quantity numeric not null check(quantity >= 0), unit text not null, input_quantity numeric not null, input_unit text not null,
  canonical_quantity numeric not null, canonical_unit text not null, conversion_factor numeric not null default 1, conversion_path jsonb not null default '[]'::jsonb,
  source_document text not null default '', notes text not null default '', staged_record_id text unique references ingested_records(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists air_emission_records (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, facility_id text not null references facilities(id) on delete cascade,
  date date not null, reporting_period text not null default '', parameter text not null, value numeric not null check(value >= 0), unit text not null,
  stack_id text not null default '', method text not null default '', regulatory_limit numeric, source_document text not null default '', notes text not null default '',
  staged_record_id text unique references ingested_records(id) on delete set null, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create index if not exists idx_water_records_org_date on water_records(organisation_id,date desc) where deleted_at is null;
create index if not exists idx_waste_records_org_date on waste_records(organisation_id,date desc) where deleted_at is null;
create index if not exists idx_material_records_org_date on material_records(organisation_id,date desc) where deleted_at is null;
create index if not exists idx_air_records_org_date on air_emission_records(organisation_id,date desc) where deleted_at is null;
drop trigger if exists trg_water_records_updated_at on water_records; create trigger trg_water_records_updated_at before update on water_records for each row execute function set_updated_at();
drop trigger if exists trg_waste_records_updated_at on waste_records; create trigger trg_waste_records_updated_at before update on waste_records for each row execute function set_updated_at();
drop trigger if exists trg_material_records_updated_at on material_records; create trigger trg_material_records_updated_at before update on material_records for each row execute function set_updated_at();
drop trigger if exists trg_air_records_updated_at on air_emission_records; create trigger trg_air_records_updated_at before update on air_emission_records for each row execute function set_updated_at();
alter table water_records enable row level security; alter table waste_records enable row level security; alter table material_records enable row level security; alter table air_emission_records enable row level security;
