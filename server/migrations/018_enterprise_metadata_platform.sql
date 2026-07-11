-- Phase 8: enterprise metadata platform.
-- Apply after 017. This is additive: existing application forms remain unchanged.

create table if not exists metadata_entities (
  id text primary key, entity_key text not null unique, name text not null, description text not null default '',
  icon text not null default 'database', is_system boolean not null default true, is_active boolean not null default true,
  configuration jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists metadata_field_types (
  id text primary key, type_key text not null unique, name text not null, description text not null default '', category text not null default 'general',
  value_schema jsonb not null default '{}'::jsonb, configuration_schema jsonb not null default '{}'::jsonb, is_system boolean not null default true, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists metadata_groups (
  id text primary key, organisation_id text references organisations(id) on delete cascade, name text not null, description text not null default '',
  group_key text not null, member_rules jsonb not null default '{}'::jsonb, status text not null default 'active' check(status in ('active','archived')),
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(organisation_id, group_key)
);
create table if not exists metadata_forms (
  id text primary key, organisation_id text references organisations(id) on delete cascade, entity_id text not null references metadata_entities(id) on delete restrict,
  form_key text not null, name text not null, description text not null default '', status text not null default 'draft' check(status in ('draft','published','archived')),
  version_number integer not null default 1 check(version_number > 0), layout_mode text not null default 'sections' check(layout_mode in ('sections','tabs','cards','accordion')),
  industry_code text not null default '', configuration jsonb not null default '{}'::jsonb, published_at timestamptz, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(organisation_id, entity_id, form_key, version_number)
);
create table if not exists metadata_form_sections (
  id text primary key, form_id text not null references metadata_forms(id) on delete cascade, section_key text not null, title text not null, description text not null default '',
  section_type text not null default 'section' check(section_type in ('tab','section','card','columns','accordion','group','repeatable')),
  position integer not null default 0, columns_count integer not null default 1 check(columns_count between 1 and 4), configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(form_id, section_key)
);
create table if not exists metadata_fields (
  id text primary key, organisation_id text references organisations(id) on delete cascade, entity_id text not null references metadata_entities(id) on delete restrict,
  form_id text references metadata_forms(id) on delete cascade, section_id text references metadata_form_sections(id) on delete set null,
  field_type_id text not null references metadata_field_types(id) on delete restrict, field_key text not null, label text not null, help_text text not null default '', placeholder text not null default '',
  position integer not null default 0, column_span integer not null default 1 check(column_span between 1 and 4), is_required boolean not null default false,
  is_system boolean not null default false, status text not null default 'draft' check(status in ('draft','published','archived')),
  default_value jsonb, options jsonb not null default '[]'::jsonb, configuration jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(organisation_id, entity_id, field_key)
);
create table if not exists metadata_layouts (
  id text primary key, organisation_id text references organisations(id) on delete cascade, entity_id text references metadata_entities(id) on delete cascade,
  layout_key text not null, name text not null, description text not null default '', status text not null default 'draft' check(status in ('draft','published','archived')),
  priority integer not null default 100, selector jsonb not null default '{}'::jsonb, layout jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(organisation_id, layout_key)
);
create table if not exists metadata_templates (
  id text primary key, organisation_id text references organisations(id) on delete cascade, entity_id text not null references metadata_entities(id) on delete restrict,
  form_id text references metadata_forms(id) on delete set null, template_key text not null, name text not null, description text not null default '', industry_code text not null default '',
  status text not null default 'published' check(status in ('draft','published','archived')), is_system_template boolean not null default false,
  payload jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(organisation_id, template_key)
);
create table if not exists metadata_validations (
  id text primary key, field_id text not null references metadata_fields(id) on delete cascade, validation_type text not null check(validation_type in ('required','minimum','maximum','regex','unique','cross-field','reference','conditional','custom')),
  rule_config jsonb not null default '{}'::jsonb, message text not null default '', position integer not null default 0, status text not null default 'active' check(status in ('active','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists metadata_conditions (
  id text primary key, organisation_id text references organisations(id) on delete cascade, name text not null, condition_key text not null,
  expression jsonb not null default '{}'::jsonb, status text not null default 'active' check(status in ('active','archived')),
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(organisation_id, condition_key)
);
create table if not exists metadata_visibility (
  id text primary key, field_id text references metadata_fields(id) on delete cascade, section_id text references metadata_form_sections(id) on delete cascade,
  condition_id text references metadata_conditions(id) on delete cascade, action text not null default 'show' check(action in ('show','hide','require','readonly')),
  inline_condition jsonb not null default '{}'::jsonb, position integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(field_id is not null or section_id is not null)
);
create table if not exists metadata_permissions (
  id text primary key, field_id text references metadata_fields(id) on delete cascade, form_id text references metadata_forms(id) on delete cascade,
  permission_key text not null default '', role_id text references roles(id) on delete cascade, group_id text references metadata_groups(id) on delete cascade,
  access_level text not null check(access_level in ('read','write','hidden','required')), selector jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(field_id is not null or form_id is not null)
);
create table if not exists metadata_workflows (
  id text primary key, organisation_id text references organisations(id) on delete cascade, entity_id text not null references metadata_entities(id) on delete cascade,
  workflow_key text not null, name text not null, description text not null default '', status text not null default 'draft' check(status in ('draft','published','archived')),
  initial_state_key text not null default 'draft', configuration jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(organisation_id, entity_id, workflow_key)
);
create table if not exists metadata_states (
  id text primary key, workflow_id text not null references metadata_workflows(id) on delete cascade, state_key text not null, name text not null,
  category text not null default 'active' check(category in ('initial','active','approved','rejected','archived')), position integer not null default 0,
  configuration jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(workflow_id, state_key)
);
create table if not exists metadata_transitions (
  id text primary key, workflow_id text not null references metadata_workflows(id) on delete cascade,
  from_state_id text not null references metadata_states(id) on delete cascade, to_state_id text not null references metadata_states(id) on delete cascade,
  name text not null, permission_key text not null default '', condition_id text references metadata_conditions(id) on delete set null,
  configuration jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(workflow_id, from_state_id, to_state_id)
);
create table if not exists metadata_workflow_instances (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, workflow_id text not null references metadata_workflows(id) on delete cascade,
  entity_id text not null references metadata_entities(id) on delete cascade, entity_record_id text not null, current_state_id text not null references metadata_states(id) on delete restrict,
  started_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organisation_id, workflow_id, entity_record_id)
);
create table if not exists metadata_workflow_history (
  id text primary key, instance_id text not null references metadata_workflow_instances(id) on delete cascade,
  from_state_id text references metadata_states(id) on delete set null, to_state_id text not null references metadata_states(id) on delete restrict,
  comment text not null default '', acted_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists metadata_versions (
  id text primary key, organisation_id text references organisations(id) on delete cascade, subject_type text not null check(subject_type in ('form','layout','template','workflow','field')),
  subject_id text not null, version_number integer not null, status text not null default 'draft' check(status in ('draft','published','archived')),
  snapshot jsonb not null default '{}'::jsonb, change_summary text not null default '', created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
  unique(subject_type, subject_id, version_number)
);
create table if not exists metadata_values (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, entity_id text not null references metadata_entities(id) on delete cascade,
  entity_record_id text not null, field_id text not null references metadata_fields(id) on delete cascade, value jsonb, display_value text not null default '',
  form_version integer, status text not null default 'active' check(status in ('active','archived')), entered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(organisation_id, entity_record_id, field_id)
);
create table if not exists metadata_translations (
  id text primary key, organisation_id text references organisations(id) on delete cascade, subject_type text not null check(subject_type in ('entity','field','form','section','layout','template','workflow','state','validation')),
  subject_id text not null, language_code text not null, label text not null default '', help_text text not null default '', message text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(subject_type, subject_id, language_code)
);
create table if not exists metadata_calculations (
  id text primary key, field_id text not null references metadata_fields(id) on delete cascade, calculation_key text not null, operation text not null check(operation in ('sum','difference','multiply','divide','percentage','expression')),
  operands jsonb not null default '[]'::jsonb, expression text not null default '', precision integer not null default 4 check(precision between 0 and 12),
  status text not null default 'active' check(status in ('active','archived')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(field_id, calculation_key)
);
create table if not exists metadata_audit_logs (
  id text primary key, organisation_id text references organisations(id) on delete set null, subject_type text not null, subject_id text not null, action text not null,
  before_value jsonb not null default '{}'::jsonb, after_value jsonb not null default '{}'::jsonb, acted_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

-- System entity registry. New entities can be registered through the metadata API without a code deployment.
insert into metadata_entities(id,entity_key,name,description,icon,is_system) values
 ('meta-entity-organization','organization','Organization','Organization profile extensions.','building-2',true),
 ('meta-entity-facility','facility','Facility','Facility operational profile extensions.','factory',true),
 ('meta-entity-activity','activity','Activity','Carbon and operational activity extensions.','chart-no-axes-combined',true),
 ('meta-entity-document','document','Document','Evidence and document metadata.','file-text',true),
 ('meta-entity-report','report','Report','Report metadata and disclosures.','file-check-2',true),
 ('meta-entity-project','project','Project','Decarbonization project extensions.','folder-kanban',true),
 ('meta-entity-supplier','supplier','Supplier','Supplier and value-chain profiles.','handshake',true),
 ('meta-entity-asset','asset','Asset','Asset and equipment profiles.','box',true),
 ('meta-entity-vehicle','vehicle','Vehicle','Fleet and vehicle profiles.','truck',true),
 ('meta-entity-department','department','Department','Department profiles.','network',true),
 ('meta-entity-business-unit','business-unit','Business Unit','Business unit profiles.','blocks',true)
on conflict(id) do update set name=excluded.name, description=excluded.description, icon=excluded.icon;

insert into metadata_field_types(id,type_key,name,category) values
 ('meta-type-text','text','Text','text'),('meta-type-textarea','textarea','Textarea','text'),('meta-type-rich-text','rich-text','Rich Text','text'),('meta-type-number','number','Number','number'),('meta-type-decimal','decimal','Decimal','number'),
 ('meta-type-currency','currency','Currency','number'),('meta-type-percentage','percentage','Percentage','number'),('meta-type-boolean','boolean','Boolean','boolean'),('meta-type-date','date','Date','date'),('meta-type-datetime','datetime','Date and Time','date'),
 ('meta-type-time','time','Time','date'),('meta-type-email','email','Email','text'),('meta-type-phone','phone','Phone','text'),('meta-type-url','url','URL','text'),('meta-type-dropdown','dropdown','Dropdown','choice'),
 ('meta-type-multi-select','multi-select','Multi Select','choice'),('meta-type-reference','reference','Reference','relationship'),('meta-type-location','location','Location','structured'),('meta-type-json','json','JSON','structured'),('meta-type-formula','formula','Formula','calculation'),
 ('meta-type-measurement','measurement','Measurement','measurement'),('meta-type-unit','unit','Unit','measurement'),('meta-type-document','document','Document','file'),('meta-type-image','image','Image','file'),('meta-type-signature','signature','Signature','file'),
 ('meta-type-file-upload','file-upload','File Upload','file'),('meta-type-user','user','User','relationship'),('meta-type-organization','organization','Organization','relationship'),('meta-type-facility','facility','Facility','relationship')
on conflict(id) do update set name=excluded.name, category=excluded.category, is_active=true;

insert into metadata_forms(id,entity_id,form_key,name,description,status,version_number,layout_mode,industry_code,configuration) values
 ('meta-form-facility-profile','meta-entity-facility','facility-operational-profile','Facility operational profile','Metadata-driven supplemental facility data.', 'published',1,'sections','', '{"allowCustomValues":true}'::jsonb)
on conflict(id) do update set name=excluded.name, description=excluded.description, status=excluded.status;
insert into metadata_form_sections(id,form_id,section_key,title,description,section_type,position,columns_count) values
 ('meta-section-facility-operations','meta-form-facility-profile','operations','Operational Inputs','Optional operational attributes that do not alter carbon calculations.','columns',1,2),
 ('meta-section-facility-compliance','meta-form-facility-profile','compliance','Compliance Context','Local reporting and assurance context.','section',2,2)
on conflict(id) do update set title=excluded.title, description=excluded.description, position=excluded.position;
insert into metadata_fields(id,entity_id,form_id,section_id,field_type_id,field_key,label,help_text,position,column_span,is_required,status,options,configuration) values
 ('meta-field-facility-capacity','meta-entity-facility','meta-form-facility-profile','meta-section-facility-operations','meta-type-decimal','production_capacity','Production capacity','Use the facility''s nominal annual production capacity.',1,1,false,'published','[]','{"unitCategory":"mass"}'::jsonb),
 ('meta-field-facility-process','meta-entity-facility','meta-form-facility-profile','meta-section-facility-operations','meta-type-dropdown','process_type','Primary process','Choose the dominant production process.',2,1,false,'published','[{"label":"Manufacturing","value":"manufacturing"},{"label":"Assembly","value":"assembly"},{"label":"Processing","value":"processing"}]','{}'::jsonb),
 ('meta-field-facility-brsr','meta-entity-facility','meta-form-facility-profile','meta-section-facility-compliance','meta-type-boolean','brsr_applicable','BRSR applicable','Marks this facility as in scope for BRSR data collection.',1,1,false,'published','[]','{}'::jsonb),
 ('meta-field-facility-notes','meta-entity-facility','meta-form-facility-profile','meta-section-facility-compliance','meta-type-textarea','audit_notes','Audit notes','Internal notes for reviewers and auditors.',2,2,false,'published','[]','{}'::jsonb)
on conflict(id) do update set label=excluded.label, help_text=excluded.help_text, options=excluded.options, configuration=excluded.configuration, status=excluded.status;
insert into metadata_validations(id,field_id,validation_type,rule_config,message) values
 ('meta-validation-facility-capacity','meta-field-facility-capacity','minimum','{"value":0}'::jsonb,'Production capacity cannot be negative.')
on conflict(id) do update set rule_config=excluded.rule_config, message=excluded.message;
insert into metadata_templates(id,entity_id,form_id,template_key,name,description,industry_code,status,is_system_template,payload) values
 ('meta-template-steel','meta-entity-facility','meta-form-facility-profile','steel-facility','Steel facility profile','Blast furnace and production capacity extension template.','steel','published',true,'{"recommendedFields":["production_capacity","process_type","brsr_applicable"]}'::jsonb),
 ('meta-template-cement','meta-entity-facility','meta-form-facility-profile','cement-facility','Cement facility profile','Kiln and clinker production extension template.','cement','published',true,'{"recommendedFields":["production_capacity","process_type","brsr_applicable"]}'::jsonb),
 ('meta-template-automotive','meta-entity-facility','meta-form-facility-profile','automotive-facility','Automotive facility profile','Assembly and supplier traceability extension template.','automotive','published',true,'{}'::jsonb),
 ('meta-template-chemical','meta-entity-facility','meta-form-facility-profile','chemical-facility','Chemical facility profile','Process safety and feedstock extension template.','chemical','published',true,'{}'::jsonb),
 ('meta-template-food','meta-entity-facility','meta-form-facility-profile','food-processing-facility','Food processing facility profile','Food processing and water context extension template.','food-processing','published',true,'{}'::jsonb),
 ('meta-template-textile','meta-entity-facility','meta-form-facility-profile','textile-facility','Textile facility profile','Textile process and supplier extension template.','textile','published',true,'{}'::jsonb),
 ('meta-template-electronics','meta-entity-facility','meta-form-facility-profile','electronics-facility','Electronics facility profile','Electronics assembly and energy extension template.','electronics','published',true,'{}'::jsonb),
 ('meta-template-power','meta-entity-facility','meta-form-facility-profile','power-facility','Power facility profile','Generation and grid context extension template.','power','published',true,'{}'::jsonb),
 ('meta-template-mining','meta-entity-facility','meta-form-facility-profile','mining-facility','Mining facility profile','Extraction and rehabilitation extension template.','mining','published',true,'{}'::jsonb)
on conflict(id) do update set name=excluded.name, description=excluded.description, payload=excluded.payload, status=excluded.status;

create index if not exists idx_metadata_forms_entity on metadata_forms(entity_id, organisation_id, status) where deleted_at is null;
create index if not exists idx_metadata_fields_form on metadata_fields(form_id, section_id, position) where deleted_at is null;
create index if not exists idx_metadata_values_lookup on metadata_values(organisation_id, entity_id, entity_record_id) where deleted_at is null;
create index if not exists idx_metadata_layouts_selector on metadata_layouts(entity_id, organisation_id, priority) where deleted_at is null;
create index if not exists idx_metadata_workflow_instances on metadata_workflow_instances(organisation_id, entity_id, entity_record_id);
create index if not exists idx_metadata_audit_logs_subject on metadata_audit_logs(organisation_id, subject_type, subject_id, created_at desc);

drop trigger if exists trg_metadata_entities_updated_at on metadata_entities; create trigger trg_metadata_entities_updated_at before update on metadata_entities for each row execute function set_updated_at();
drop trigger if exists trg_metadata_field_types_updated_at on metadata_field_types; create trigger trg_metadata_field_types_updated_at before update on metadata_field_types for each row execute function set_updated_at();
drop trigger if exists trg_metadata_groups_updated_at on metadata_groups; create trigger trg_metadata_groups_updated_at before update on metadata_groups for each row execute function set_updated_at();
drop trigger if exists trg_metadata_forms_updated_at on metadata_forms; create trigger trg_metadata_forms_updated_at before update on metadata_forms for each row execute function set_updated_at();
drop trigger if exists trg_metadata_form_sections_updated_at on metadata_form_sections; create trigger trg_metadata_form_sections_updated_at before update on metadata_form_sections for each row execute function set_updated_at();
drop trigger if exists trg_metadata_fields_updated_at on metadata_fields; create trigger trg_metadata_fields_updated_at before update on metadata_fields for each row execute function set_updated_at();
drop trigger if exists trg_metadata_layouts_updated_at on metadata_layouts; create trigger trg_metadata_layouts_updated_at before update on metadata_layouts for each row execute function set_updated_at();
drop trigger if exists trg_metadata_templates_updated_at on metadata_templates; create trigger trg_metadata_templates_updated_at before update on metadata_templates for each row execute function set_updated_at();
drop trigger if exists trg_metadata_validations_updated_at on metadata_validations; create trigger trg_metadata_validations_updated_at before update on metadata_validations for each row execute function set_updated_at();
drop trigger if exists trg_metadata_conditions_updated_at on metadata_conditions; create trigger trg_metadata_conditions_updated_at before update on metadata_conditions for each row execute function set_updated_at();
drop trigger if exists trg_metadata_visibility_updated_at on metadata_visibility; create trigger trg_metadata_visibility_updated_at before update on metadata_visibility for each row execute function set_updated_at();
drop trigger if exists trg_metadata_permissions_updated_at on metadata_permissions; create trigger trg_metadata_permissions_updated_at before update on metadata_permissions for each row execute function set_updated_at();
drop trigger if exists trg_metadata_workflows_updated_at on metadata_workflows; create trigger trg_metadata_workflows_updated_at before update on metadata_workflows for each row execute function set_updated_at();
drop trigger if exists trg_metadata_states_updated_at on metadata_states; create trigger trg_metadata_states_updated_at before update on metadata_states for each row execute function set_updated_at();
drop trigger if exists trg_metadata_transitions_updated_at on metadata_transitions; create trigger trg_metadata_transitions_updated_at before update on metadata_transitions for each row execute function set_updated_at();
drop trigger if exists trg_metadata_workflow_instances_updated_at on metadata_workflow_instances; create trigger trg_metadata_workflow_instances_updated_at before update on metadata_workflow_instances for each row execute function set_updated_at();
drop trigger if exists trg_metadata_values_updated_at on metadata_values; create trigger trg_metadata_values_updated_at before update on metadata_values for each row execute function set_updated_at();
drop trigger if exists trg_metadata_translations_updated_at on metadata_translations; create trigger trg_metadata_translations_updated_at before update on metadata_translations for each row execute function set_updated_at();
drop trigger if exists trg_metadata_calculations_updated_at on metadata_calculations; create trigger trg_metadata_calculations_updated_at before update on metadata_calculations for each row execute function set_updated_at();

alter table metadata_entities enable row level security; alter table metadata_field_types enable row level security; alter table metadata_groups enable row level security; alter table metadata_forms enable row level security; alter table metadata_form_sections enable row level security; alter table metadata_fields enable row level security; alter table metadata_layouts enable row level security; alter table metadata_templates enable row level security; alter table metadata_validations enable row level security; alter table metadata_conditions enable row level security; alter table metadata_visibility enable row level security; alter table metadata_permissions enable row level security; alter table metadata_workflows enable row level security; alter table metadata_states enable row level security; alter table metadata_transitions enable row level security; alter table metadata_workflow_instances enable row level security; alter table metadata_workflow_history enable row level security; alter table metadata_versions enable row level security; alter table metadata_values enable row level security; alter table metadata_translations enable row level security; alter table metadata_calculations enable row level security; alter table metadata_audit_logs enable row level security;

insert into permissions(id,key,description) values
 ('perm-metadata-read','metadata.read','Read metadata-driven forms and values'),('perm-metadata-manage','metadata.manage','Manage metadata entities, forms, layouts, and templates'),('perm-metadata-publish','metadata.publish','Publish and roll back metadata versions'),('perm-metadata-values-edit','metadata.values.edit','Enter metadata-driven values'),('perm-metadata-workflow','metadata.workflow','Run metadata workflows'),('perm-metadata-export','metadata.export','Export metadata definitions'),('perm-metadata-import','metadata.import','Import metadata definitions')
on conflict(id) do update set key=excluded.key, description=excluded.description;
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p where r.id in ('role-super-admin','role-platform-admin','role-organisation-admin') and p.key like 'metadata.%'
on conflict do nothing;
insert into role_permissions(role_id,permission_id)
select 'role-sustainability-manager',id from permissions where key in ('metadata.read','metadata.values.edit','metadata.workflow','metadata.export')
on conflict do nothing;
insert into role_permissions(role_id,permission_id)
select 'role-plant-manager',id from permissions where key in ('metadata.read','metadata.values.edit')
on conflict do nothing;
