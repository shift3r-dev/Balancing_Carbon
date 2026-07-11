-- Phase 5 carbon accounting workflow foundation. Additive; preserves existing ledger APIs.

alter table organisations add column if not exists legal_name text default '';
alter table organisations add column if not exists sub_industry text default '';
alter table organisations add column if not exists country text default 'India';
alter table organisations add column if not exists state text default '';
alter table organisations add column if not exists city text default '';
alter table organisations add column if not exists currency text default 'INR';
alter table organisations add column if not exists time_zone text default 'Asia/Kolkata';
alter table organisations add column if not exists fiscal_year text default '';
alter table organisations add column if not exists base_year text default '';
alter table organisations add column if not exists reporting_framework text default '';
alter table organisations add column if not exists organization_boundary text default '';
alter table organisations add column if not exists operational_boundary text default '';
alter table organisations add column if not exists business_description text default '';
alter table organisations add column if not exists website text default '';
alter table organisations add column if not exists logo_url text default '';

alter table facilities add column if not exists facility_code text default '';
alter table facilities add column if not exists plant_type text default '';
alter table facilities add column if not exists business_unit text default '';
alter table facilities add column if not exists address text default '';
alter table facilities add column if not exists country text default 'India';
alter table facilities add column if not exists latitude numeric;
alter table facilities add column if not exists longitude numeric;
alter table facilities add column if not exists operational_status text not null default 'active';
alter table facilities add column if not exists operating_hours numeric;
alter table facilities add column if not exists commission_date date;
alter table facilities add column if not exists primary_products text default '';
alter table facilities add column if not exists manager_name text default '';
alter table facilities add column if not exists reporting_boundary text default '';
alter table facilities add column if not exists archived_at timestamptz;
alter table facilities add column if not exists deleted_at timestamptz;

create table if not exists emission_factor_registry (
  id text primary key, factor_key text not null, source_type text not null, scope text not null check(scope in ('scope-1','scope-2')),
  country text not null default 'India', region text default '', source_name text not null, version text not null, publication_year integer,
  effective_from date, effective_to date, factor_value numeric not null, factor_unit text not null, activity_unit text not null,
  reference_url text default '', status text not null default 'active' check(status in ('draft','active','retired')),
  supersedes_id text references emission_factor_registry(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(factor_key, version)
);

create table if not exists activity_records (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, facility_id text not null references facilities(id) on delete restrict,
  activity_category text not null check(activity_category in ('electricity','fuel','steam','purchased-heat','purchased-cooling','refrigerant','water','waste','production','business-travel')),
  source_type text not null, activity_date date not null, reporting_period text not null, quantity numeric not null check(quantity >= 0), unit text not null,
  supplier text default '', invoice_number text default '', cost numeric, currency text default 'INR', emission_factor_id text references emission_factor_registry(id) on delete set null,
  verification_status text not null default 'draft' check(verification_status in ('draft','submitted','pending-review','verified','approved','rejected')),
  notes text default '', source_document text default '', version_number integer not null default 1, supersedes_id text references activity_records(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists activity_evidence_links (
  id text primary key, activity_record_id text not null references activity_records(id) on delete cascade, document_id text references documents(id) on delete set null,
  evidence_type text not null default 'supporting-document', verification_status text not null default 'pending-review', created_at timestamptz not null default now()
);

create table if not exists calculation_records (
  id text primary key, activity_record_id text not null references activity_records(id) on delete cascade, organisation_id text not null references organisations(id) on delete cascade,
  emission_factor_id text references emission_factor_registry(id) on delete set null, factor_version text default '', formula text not null, input_snapshot jsonb not null,
  evidence_snapshot jsonb not null default '[]'::jsonb, emissions_kg_co2e numeric not null, emissions_t_co2e numeric not null, calculated_by uuid references auth.users(id) on delete set null,
  calculated_at timestamptz not null default now(), supersedes_id text references calculation_records(id) on delete set null, status text not null default 'current' check(status in ('current','superseded','invalidated'))
);

create index if not exists idx_activity_records_org_date on activity_records(organisation_id, activity_date) where deleted_at is null;
create index if not exists idx_activity_records_facility on activity_records(facility_id) where deleted_at is null;
create index if not exists idx_activity_records_review on activity_records(organisation_id, verification_status) where deleted_at is null;
create index if not exists idx_factor_registry_lookup on emission_factor_registry(factor_key, country, region, status) where deleted_at is null;
drop trigger if exists trg_factor_registry_updated_at on emission_factor_registry; create trigger trg_factor_registry_updated_at before update on emission_factor_registry for each row execute function set_updated_at();
drop trigger if exists trg_activity_records_updated_at on activity_records; create trigger trg_activity_records_updated_at before update on activity_records for each row execute function set_updated_at();

alter table emission_factor_registry enable row level security;
alter table activity_records enable row level security;
alter table activity_evidence_links enable row level security;
alter table calculation_records enable row level security;
