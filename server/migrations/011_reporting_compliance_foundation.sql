-- Phase 6 reporting and compliance foundation. Preserves existing reports table and routes.

create table if not exists compliance_frameworks (
  id text primary key, key text not null unique, name text not null, status text not null default 'architecture' check(status in ('active','architecture','future')),
  description text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists report_templates (
  id text primary key, organisation_id text references organisations(id) on delete cascade, framework_id text references compliance_frameworks(id) on delete set null,
  name text not null, report_type text not null, description text not null default '', structure jsonb not null default '[]'::jsonb,
  is_system_template boolean not null default false, status text not null default 'draft' check(status in ('draft','active','archived')),
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists report_versions (
  id text primary key, report_id text not null references reports(id) on delete cascade, version_number integer not null,
  content jsonb not null default '{}'::jsonb, calculation_snapshot jsonb not null default '{}'::jsonb, validation_snapshot jsonb not null default '{}'::jsonb,
  change_summary text default '', created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), unique(report_id, version_number)
);
create table if not exists report_sections (
  id text primary key, report_version_id text not null references report_versions(id) on delete cascade, section_type text not null,
  title text not null, position integer not null, content jsonb not null default '{}'::jsonb, approval_status text not null default 'draft' check(approval_status in ('draft','under-review','approved','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists report_evidence_links (
  id text primary key, report_section_id text not null references report_sections(id) on delete cascade,
  activity_record_id text references activity_records(id) on delete set null, document_id text references documents(id) on delete set null,
  calculation_record_id text references calculation_records(id) on delete set null, emission_factor_id text references emission_factor_registry(id) on delete set null,
  evidence_type text not null, created_at timestamptz not null default now()
);
create table if not exists report_approvals (
  id text primary key, report_id text not null references reports(id) on delete cascade, status text not null check(status in ('under-review','approved','rejected','changes-requested')),
  comment text default '', acted_by uuid references auth.users(id) on delete set null, acted_at timestamptz not null default now()
);
create table if not exists report_exports (
  id text primary key, report_id text not null references reports(id) on delete cascade, organisation_id text not null references organisations(id) on delete cascade,
  format text not null check(format in ('pdf','excel','csv','json')), status text not null default 'queued' check(status in ('queued','completed','failed')),
  file_url text default '', exported_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists report_schedules (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, template_id text references report_templates(id) on delete set null,
  frequency text not null check(frequency in ('monthly','quarterly','annual')), recipients jsonb not null default '[]'::jsonb, next_run_at timestamptz,
  active boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

insert into compliance_frameworks(id,key,name,status,description) values
 ('framework-brsr','BRSR','Business Responsibility and Sustainability Reporting','active','Indian BRSR reporting structure'),
 ('framework-cdp','CDP','Carbon Disclosure Project','architecture','Future-ready structure'),
 ('framework-gri','GRI','Global Reporting Initiative','architecture','Future-ready structure'),
 ('framework-issb','ISSB','International Sustainability Standards Board','architecture','Future-ready structure'),
 ('framework-csrd','CSRD','Corporate Sustainability Reporting Directive','architecture','Future-ready structure')
on conflict(id) do nothing;

create index if not exists idx_report_templates_org on report_templates(organisation_id) where deleted_at is null;
create index if not exists idx_report_versions_report on report_versions(report_id,version_number desc);
create index if not exists idx_report_exports_org on report_exports(organisation_id,created_at desc);
drop trigger if exists trg_compliance_frameworks_updated_at on compliance_frameworks; create trigger trg_compliance_frameworks_updated_at before update on compliance_frameworks for each row execute function set_updated_at();
drop trigger if exists trg_report_templates_updated_at on report_templates; create trigger trg_report_templates_updated_at before update on report_templates for each row execute function set_updated_at();
drop trigger if exists trg_report_sections_updated_at on report_sections; create trigger trg_report_sections_updated_at before update on report_sections for each row execute function set_updated_at();
drop trigger if exists trg_report_schedules_updated_at on report_schedules; create trigger trg_report_schedules_updated_at before update on report_schedules for each row execute function set_updated_at();
alter table compliance_frameworks enable row level security; alter table report_templates enable row level security; alter table report_versions enable row level security; alter table report_sections enable row level security; alter table report_evidence_links enable row level security; alter table report_approvals enable row level security; alter table report_exports enable row level security; alter table report_schedules enable row level security;
