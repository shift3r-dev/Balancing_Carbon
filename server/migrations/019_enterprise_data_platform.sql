-- Phase 7 roadmap realignment: enterprise data ingestion platform.
-- Apply after 018. Additive and safe to rerun.

create table if not exists data_connector_catalog (
  id text primary key, connector_key text not null unique, name text not null, category text not null,
  description text not null default '', auth_type text not null default 'none', capabilities jsonb not null default '[]'::jsonb,
  configuration_schema jsonb not null default '{}'::jsonb, status text not null default 'available' check(status in ('available','preview','disabled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists data_connections (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade,
  connector_id text not null references data_connector_catalog(id) on delete restrict, name text not null,
  status text not null default 'draft' check(status in ('draft','active','paused','error','archived')),
  credential_reference text not null default '', configuration jsonb not null default '{}'::jsonb,
  last_tested_at timestamptz, last_synced_at timestamptz, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists data_source_definitions (
  id text primary key, source_key text not null unique, name text not null, category text not null,
  target_entity_key text not null, required_fields jsonb not null default '[]'::jsonb, optional_fields jsonb not null default '[]'::jsonb,
  supported_units jsonb not null default '[]'::jsonb, status text not null default 'active' check(status in ('active','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists data_mappings (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade,
  connection_id text references data_connections(id) on delete set null, source_definition_id text not null references data_source_definitions(id) on delete restrict,
  name text not null, description text not null default '', status text not null default 'draft' check(status in ('draft','published','archived')),
  version_number integer not null default 1, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists data_mapping_fields (
  id text primary key, mapping_id text not null references data_mappings(id) on delete cascade,
  source_column text not null, target_field text not null, transformation text not null default 'identity',
  transformation_config jsonb not null default '{}'::jsonb, validation_config jsonb not null default '{}'::jsonb,
  position integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(mapping_id, source_column)
);
create table if not exists data_import_jobs (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade,
  source_definition_id text not null references data_source_definitions(id) on delete restrict,
  mapping_id text references data_mappings(id) on delete set null, connection_id text references data_connections(id) on delete set null,
  filename text not null default '', format text not null check(format in ('csv','excel','json','api','iot')),
  status text not null default 'uploaded' check(status in ('uploaded','mapping','validating','ready','queued','processing','completed','partial','failed','cancelled')),
  row_count integer not null default 0, valid_count integer not null default 0, invalid_count integer not null default 0, duplicate_count integer not null default 0,
  confidence_score numeric not null default 0 check(confidence_score between 0 and 100), retry_count integer not null default 0,
  source_headers jsonb not null default '[]'::jsonb, mapping_snapshot jsonb not null default '{}'::jsonb,
  error_summary jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz, deleted_at timestamptz
);
create table if not exists data_import_rows (
  id text primary key, import_job_id text not null references data_import_jobs(id) on delete cascade,
  row_number integer not null, source_data jsonb not null default '{}'::jsonb, mapped_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb, status text not null default 'pending' check(status in ('pending','valid','invalid','duplicate','imported','failed')),
  confidence_score numeric not null default 0 check(confidence_score between 0 and 100), duplicate_signature text not null default '',
  issues jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(import_job_id, row_number)
);
create table if not exists data_quality_rules (
  id text primary key, organisation_id text references organisations(id) on delete cascade,
  source_definition_id text references data_source_definitions(id) on delete cascade, rule_key text not null,
  name text not null, rule_type text not null check(rule_type in ('required','type','unit','range','regex','reference','duplicate','anomaly','custom')),
  severity text not null default 'error' check(severity in ('info','warning','error','critical')),
  configuration jsonb not null default '{}'::jsonb, status text not null default 'active' check(status in ('active','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists data_quality_issues (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade,
  import_job_id text not null references data_import_jobs(id) on delete cascade, import_row_id text references data_import_rows(id) on delete cascade,
  rule_id text references data_quality_rules(id) on delete set null, field_name text not null default '', issue_code text not null,
  severity text not null check(severity in ('info','warning','error','critical')), message text not null,
  status text not null default 'open' check(status in ('open','accepted','resolved','ignored')),
  resolved_by uuid references auth.users(id) on delete set null, resolved_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists data_pipeline_runs (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade,
  import_job_id text references data_import_jobs(id) on delete cascade, connection_id text references data_connections(id) on delete cascade,
  status text not null default 'queued' check(status in ('queued','processing','completed','partial','failed','cancelled')),
  attempt_number integer not null default 1, started_at timestamptz, completed_at timestamptz,
  metrics jsonb not null default '{}'::jsonb, error_details jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists data_pipeline_events (
  id text primary key, pipeline_run_id text not null references data_pipeline_runs(id) on delete cascade,
  event_type text not null, message text not null default '', details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists data_sync_schedules (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade,
  connection_id text not null references data_connections(id) on delete cascade, mapping_id text references data_mappings(id) on delete set null,
  frequency text not null check(frequency in ('manual','hourly','daily','weekly','monthly')), time_zone text not null default 'Asia/Kolkata',
  next_run_at timestamptz, status text not null default 'paused' check(status in ('active','paused','archived')),
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists ingested_records (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade,
  source_definition_id text not null references data_source_definitions(id) on delete restrict,
  import_job_id text references data_import_jobs(id) on delete set null, import_row_id text references data_import_rows(id) on delete set null,
  target_entity_key text not null, external_record_id text not null default '', record_data jsonb not null default '{}'::jsonb,
  canonical_data jsonb not null default '{}'::jsonb, duplicate_signature text not null, quality_score numeric not null default 0,
  status text not null default 'staged' check(status in ('staged','approved','posted','rejected','superseded')),
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(organisation_id, duplicate_signature)
);
create table if not exists data_record_versions (
  id text primary key, ingested_record_id text not null references ingested_records(id) on delete cascade,
  version_number integer not null, snapshot jsonb not null, change_reason text not null default '',
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
  unique(ingested_record_id, version_number)
);

insert into data_connector_catalog(id,connector_key,name,category,description,auth_type,capabilities,status) values
 ('connector-csv','csv','CSV / Excel Upload','file','Validated spreadsheet and delimited-file ingestion.','none','["preview","mapping","bulk-import"]','available'),
 ('connector-sap','sap','SAP','erp','SAP ERP and S/4HANA sustainability data source.','oauth2','["finance","procurement","production","inventory"]','preview'),
 ('connector-oracle','oracle','Oracle','erp','Oracle ERP and database source.','oauth2','["finance","procurement","production"]','preview'),
 ('connector-dynamics','dynamics','Microsoft Dynamics','erp','Dynamics 365 operational and financial source.','oauth2','["finance","inventory","production"]','preview'),
 ('connector-odoo','odoo','Odoo','erp','Odoo operations and inventory source.','api-key','["inventory","production","finance"]','preview'),
 ('connector-zoho','zoho','Zoho','finance','Zoho Books and operations source.','oauth2','["finance","expenses"]','preview'),
 ('connector-quickbooks','quickbooks','QuickBooks','finance','QuickBooks bills and purchasing source.','oauth2','["finance","expenses"]','preview'),
 ('connector-tally','tally','Tally','finance','Tally accounting and purchase ledger source.','api-key','["finance","purchases"]','preview'),
 ('connector-smart-meter','smart-meter','Smart Meter / IoT','iot','Interval electricity and equipment telemetry.','api-key','["electricity","interval-data"]','preview')
on conflict(id) do update set name=excluded.name, description=excluded.description, capabilities=excluded.capabilities, status=excluded.status;

insert into data_source_definitions(id,source_key,name,category,target_entity_key,required_fields,optional_fields,supported_units) values
 ('data-source-energy','energy-activity','Energy and fuel activity','energy','activity','["facility_id","date","source_type","quantity","unit"]','["reporting_period","source_document","supplier","invoice_number","cost","currency","notes"]','["kWh","MWh","GJ","litre","SCM","kg","tonne"]'),
 ('data-source-production','production-output','Production output','production','production','["facility_id","date","quantity","unit"]','["reporting_period","source_document","batch","shift","product","notes"]','["kg","tonne","count"]'),
 ('data-source-water','water','Water and wastewater','environmental','water','["facility_id","date","quantity","unit","flow_type"]','["source","destination","quality_parameter","notes"]','["litre","water-kL","m3"]'),
 ('data-source-waste','waste','Waste and recycling','environmental','waste','["facility_id","date","quantity","unit","waste_type"]','["disposal_method","recovery_method","vendor","notes"]','["kg","tonne"]'),
 ('data-source-air','air-emissions','Air and stack monitoring','environmental','air-emission','["facility_id","date","parameter","value","unit"]','["stack_id","method","limit","notes"]','[]'),
 ('data-source-material','raw-material','Raw material and inventory','production','material','["facility_id","date","material","quantity","unit"]','["supplier","batch","origin","recycled_content","notes"]','["kg","tonne","litre","m3"]')
on conflict(id) do update set name=excluded.name, required_fields=excluded.required_fields, optional_fields=excluded.optional_fields, supported_units=excluded.supported_units;

create index if not exists idx_data_connections_org on data_connections(organisation_id,status) where deleted_at is null;
create index if not exists idx_data_import_jobs_org on data_import_jobs(organisation_id,created_at desc) where deleted_at is null;
create index if not exists idx_data_import_rows_job on data_import_rows(import_job_id,status,row_number);
create index if not exists idx_data_quality_issues_job on data_quality_issues(import_job_id,status,severity);
create index if not exists idx_ingested_records_org on ingested_records(organisation_id,target_entity_key,created_at desc) where deleted_at is null;

drop trigger if exists trg_data_connector_catalog_updated_at on data_connector_catalog; create trigger trg_data_connector_catalog_updated_at before update on data_connector_catalog for each row execute function set_updated_at();
drop trigger if exists trg_data_connections_updated_at on data_connections; create trigger trg_data_connections_updated_at before update on data_connections for each row execute function set_updated_at();
drop trigger if exists trg_data_source_definitions_updated_at on data_source_definitions; create trigger trg_data_source_definitions_updated_at before update on data_source_definitions for each row execute function set_updated_at();
drop trigger if exists trg_data_mappings_updated_at on data_mappings; create trigger trg_data_mappings_updated_at before update on data_mappings for each row execute function set_updated_at();
drop trigger if exists trg_data_mapping_fields_updated_at on data_mapping_fields; create trigger trg_data_mapping_fields_updated_at before update on data_mapping_fields for each row execute function set_updated_at();
drop trigger if exists trg_data_import_jobs_updated_at on data_import_jobs; create trigger trg_data_import_jobs_updated_at before update on data_import_jobs for each row execute function set_updated_at();
drop trigger if exists trg_data_import_rows_updated_at on data_import_rows; create trigger trg_data_import_rows_updated_at before update on data_import_rows for each row execute function set_updated_at();
drop trigger if exists trg_data_quality_rules_updated_at on data_quality_rules; create trigger trg_data_quality_rules_updated_at before update on data_quality_rules for each row execute function set_updated_at();
drop trigger if exists trg_data_sync_schedules_updated_at on data_sync_schedules; create trigger trg_data_sync_schedules_updated_at before update on data_sync_schedules for each row execute function set_updated_at();
drop trigger if exists trg_ingested_records_updated_at on ingested_records; create trigger trg_ingested_records_updated_at before update on ingested_records for each row execute function set_updated_at();

alter table data_connector_catalog enable row level security; alter table data_connections enable row level security; alter table data_source_definitions enable row level security; alter table data_mappings enable row level security; alter table data_mapping_fields enable row level security; alter table data_import_jobs enable row level security; alter table data_import_rows enable row level security; alter table data_quality_rules enable row level security; alter table data_quality_issues enable row level security; alter table data_pipeline_runs enable row level security; alter table data_pipeline_events enable row level security; alter table data_sync_schedules enable row level security; alter table ingested_records enable row level security; alter table data_record_versions enable row level security;

insert into permissions(id,key,description) values
 ('perm-data-read','data.read','View data connectors, imports, and quality results'),
 ('perm-data-import','data.import','Upload, map, validate, and import operational data'),
 ('perm-data-connect','data.connect','Configure enterprise data connectors'),
 ('perm-data-manage','data.manage','Manage mappings, quality rules, and pipelines'),
 ('perm-data-approve','data.approve','Approve staged records for operational posting')
on conflict(id) do update set key=excluded.key, description=excluded.description;
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p where r.id in ('role-super-admin','role-platform-admin','role-organisation-admin') and p.key like 'data.%'
on conflict do nothing;
insert into role_permissions(role_id,permission_id)
select 'role-sustainability-manager',id from permissions where key in ('data.read','data.import','data.manage','data.approve') on conflict do nothing;
insert into role_permissions(role_id,permission_id)
select 'role-plant-manager',id from permissions where key in ('data.read','data.import') on conflict do nothing;
