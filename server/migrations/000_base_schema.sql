-- Balancing Carbon base Supabase schema.
-- Run this first on a fresh Supabase project, before 001/002/003.
-- The live app uses Supabase Auth plus this profiles table for tenant lookup.

create table if not exists organisations (
  id text primary key,
  name text not null,
  industry text default '',
  location text default '',
  employee_count integer default 0 check (employee_count >= 0),
  reporting_year text default 'FY 2025-26',
  target_reduction_percent numeric default 0 check (target_reduction_percent >= 0 and target_reduction_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  organisation_id text not null references organisations(id) on delete cascade,
  role text not null default 'organisation_admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists facilities (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  name text not null,
  location text not null default '',
  industry_type text not null default '',
  production_output numeric not null default 0 check (production_output >= 0),
  production_unit text not null default 'Tonnes',
  reporting_period text not null default 'FY 2025-26',
  electricity_consumption numeric not null default 0 check (electricity_consumption >= 0),
  fuel_consumption numeric not null default 0 check (fuel_consumption >= 0),
  fuel_type text not null default 'Diesel',
  renewable_energy_usage numeric not null default 0 check (renewable_energy_usage >= 0),
  emissions_scope_1 numeric not null default 0 check (emissions_scope_1 >= 0),
  emissions_scope_2 numeric not null default 0 check (emissions_scope_2 >= 0),
  carbon_intensity numeric not null default 0 check (carbon_intensity >= 0),
  esg_readiness_status text not null default 'Needs Improvement'
    check (esg_readiness_status in ('Excellent', 'Good', 'Needs Improvement', 'Critical', 'Not Assessed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists energy_records (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  facility_id text not null references facilities(id) on delete cascade,
  date date not null,
  reporting_period text not null default 'FY 2025-26',
  energy_type text not null,
  quantity numeric not null check (quantity >= 0),
  unit text not null,
  source_document text,
  notes text,
  emissions numeric not null default 0 check (emissions >= 0),
  audit_trail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists esg_questions (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  category text not null,
  question text not null,
  answer text default '',
  evidence text default '',
  score integer default 0 check (score >= 0 and score <= 100),
  status text not null default 'Partial'
    check (status in ('Compliant', 'Partial', 'Non-Compliant', 'Not Applicable')),
  recommendation text default '',
  assigned_user text default '',
  review_status text not null default 'Draft'
    check (review_status in ('Approved', 'In Review', 'Draft', 'Missing Evidence')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists oem_questionnaires (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  title text not null,
  oem_name text not null,
  due_date date not null,
  status text not null default 'Not Started'
    check (status in ('Completed', 'In Progress', 'Not Started')),
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists documents (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  upload_date date not null default current_date,
  facility_id text references facilities(id) on delete set null,
  period text not null default 'FY 2025-26',
  size text not null default 'Unknown',
  ai_status text not null default 'Processed'
    check (ai_status in ('Processed', 'Processing', 'Failed')),
  evidence_usage text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reports (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  title text not null,
  type text not null default 'Executive Summary',
  period text not null default 'FY 2025-26',
  created_date date not null default current_date,
  summary text default '',
  status text not null default 'Draft' check (status in ('Generated', 'Draft')),
  download_url text default '#',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_conversations (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  title text not null,
  last_updated timestamptz not null default now(),
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null default '',
  action text not null,
  details text not null default '',
  timestamp timestamptz not null default now()
);

-- Upgrade legacy installations where tables existed before this migration.
alter table organisations add column if not exists created_at timestamptz not null default now();
alter table organisations add column if not exists updated_at timestamptz not null default now();
alter table profiles add column if not exists created_at timestamptz not null default now();
alter table profiles add column if not exists updated_at timestamptz not null default now();
alter table facilities add column if not exists created_at timestamptz not null default now();
alter table facilities add column if not exists updated_at timestamptz not null default now();
alter table energy_records add column if not exists created_at timestamptz not null default now();
alter table energy_records add column if not exists updated_at timestamptz not null default now();
alter table esg_questions add column if not exists created_at timestamptz not null default now();
alter table esg_questions add column if not exists updated_at timestamptz not null default now();
alter table oem_questionnaires add column if not exists created_at timestamptz not null default now();
alter table oem_questionnaires add column if not exists updated_at timestamptz not null default now();
alter table documents add column if not exists created_at timestamptz not null default now();
alter table documents add column if not exists updated_at timestamptz not null default now();
alter table reports add column if not exists created_at timestamptz not null default now();
alter table reports add column if not exists updated_at timestamptz not null default now();
alter table ai_conversations add column if not exists created_at timestamptz not null default now();
alter table ai_conversations add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_profiles_org on profiles(organisation_id);
create index if not exists idx_facilities_org on facilities(organisation_id);
create index if not exists idx_energy_org on energy_records(organisation_id);
create index if not exists idx_energy_facility on energy_records(facility_id);
create index if not exists idx_esg_org on esg_questions(organisation_id);
create index if not exists idx_oem_org on oem_questionnaires(organisation_id);
create index if not exists idx_documents_org on documents(organisation_id);
create index if not exists idx_reports_org on reports(organisation_id);
create index if not exists idx_audit_logs_org on audit_logs(organisation_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_organisations_updated_at on organisations;
create trigger trg_organisations_updated_at
before update on organisations
for each row execute function set_updated_at();

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
before update on profiles
for each row execute function set_updated_at();

drop trigger if exists trg_facilities_updated_at on facilities;
create trigger trg_facilities_updated_at
before update on facilities
for each row execute function set_updated_at();

drop trigger if exists trg_energy_records_updated_at on energy_records;
create trigger trg_energy_records_updated_at
before update on energy_records
for each row execute function set_updated_at();

drop trigger if exists trg_esg_questions_updated_at on esg_questions;
create trigger trg_esg_questions_updated_at
before update on esg_questions
for each row execute function set_updated_at();

drop trigger if exists trg_oem_questionnaires_updated_at on oem_questionnaires;
create trigger trg_oem_questionnaires_updated_at
before update on oem_questionnaires
for each row execute function set_updated_at();

drop trigger if exists trg_documents_updated_at on documents;
create trigger trg_documents_updated_at
before update on documents
for each row execute function set_updated_at();

drop trigger if exists trg_reports_updated_at on reports;
create trigger trg_reports_updated_at
before update on reports
for each row execute function set_updated_at();

drop trigger if exists trg_ai_conversations_updated_at on ai_conversations;
create trigger trg_ai_conversations_updated_at
before update on ai_conversations
for each row execute function set_updated_at();

-- RLS is enabled for future direct Supabase access. The current Express API
-- uses the service role key and still applies organisation_id filters itself.
alter table organisations enable row level security;
alter table profiles enable row level security;
alter table facilities enable row level security;
alter table energy_records enable row level security;
alter table esg_questions enable row level security;
alter table oem_questionnaires enable row level security;
alter table documents enable row level security;
alter table reports enable row level security;
alter table ai_conversations enable row level security;
alter table audit_logs enable row level security;

drop policy if exists "profiles select own" on profiles;
create policy "profiles select own" on profiles
for select using (id = auth.uid());

drop policy if exists "tenant select organisations" on organisations;
create policy "tenant select organisations" on organisations
for select using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.organisation_id = organisations.id
  )
);

-- The remaining tenant data is currently accessed through the backend API.
-- Add direct-client insert/update/delete policies only if the frontend starts
-- writing to Supabase without the Express API.
