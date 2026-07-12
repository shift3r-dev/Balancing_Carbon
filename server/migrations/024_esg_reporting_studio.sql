-- Phase 9: ESG Reporting Studio.
-- Apply after 023. Additive and safe to rerun.

alter table reports add column if not exists studio_status text not null default 'draft'
  check (studio_status in ('draft','editing','ready','locked'));
alter table reports add column if not exists brand_kit_id text;

create table if not exists report_brand_kits (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade,
  name text not null, logo_document_id text references documents(id) on delete set null,
  primary_color text not null default '#173f2a', secondary_color text not null default '#dce9df', accent_color text not null default '#d39b35',
  heading_font text not null default 'Arial', body_font text not null default 'Arial', footer_text text not null default '',
  page_size text not null default 'A4' check(page_size in ('A4','Letter','16:9')),
  configuration jsonb not null default '{}'::jsonb, is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
alter table reports drop constraint if exists reports_brand_kit_id_fkey;
alter table reports add constraint reports_brand_kit_id_fkey foreign key (brand_kit_id) references report_brand_kits(id) on delete set null;

create table if not exists report_studio_pages (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, report_id text not null references reports(id) on delete cascade,
  page_number integer not null, title text not null default '', layout text not null default 'single' check(layout in ('single','two-column','cover','full-bleed')),
  background_color text not null default '#ffffff', configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(report_id,page_number)
);
create table if not exists report_studio_blocks (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, report_id text not null references reports(id) on delete cascade,
  page_id text not null references report_studio_pages(id) on delete cascade, block_type text not null
    check(block_type in ('heading','narrative','kpi-grid','chart','table','image','callout','spacer','page-break')),
  position integer not null, column_index integer not null default 0, title text not null default '', content jsonb not null default '{}'::jsonb,
  style jsonb not null default '{}'::jsonb, data_binding jsonb not null default '{}'::jsonb, source_label text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(page_id,position,column_index)
);
create table if not exists report_block_evidence (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade,
  block_id text not null references report_studio_blocks(id) on delete cascade, document_id text references documents(id) on delete cascade,
  calculation_record_id text references calculation_records(id) on delete cascade, evidence_label text not null default '',
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists report_cross_references (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, report_id text not null references reports(id) on delete cascade,
  source_block_id text not null references report_studio_blocks(id) on delete cascade, target_block_id text not null references report_studio_blocks(id) on delete cascade,
  label text not null, created_at timestamptz not null default now(), unique(source_block_id,target_block_id)
);
create table if not exists report_narrative_generations (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, report_id text not null references reports(id) on delete cascade,
  block_id text references report_studio_blocks(id) on delete set null, prompt_key text not null, prompt_text text not null default '',
  generated_text text not null, citations jsonb not null default '[]'::jsonb, provider text not null, model text not null,
  accepted boolean not null default false, generated_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), accepted_at timestamptz
);

alter table report_exports drop constraint if exists report_exports_format_check;
alter table report_exports add constraint report_exports_format_check check(format in ('pdf','excel','csv','json','docx','pptx','xlsx'));

create index if not exists idx_report_studio_pages_report on report_studio_pages(organisation_id,report_id,page_number);
create index if not exists idx_report_studio_blocks_page on report_studio_blocks(organisation_id,page_id,position);
create index if not exists idx_report_block_evidence_block on report_block_evidence(organisation_id,block_id);
create index if not exists idx_report_narratives_report on report_narrative_generations(organisation_id,report_id,created_at desc);
drop trigger if exists trg_report_brand_kits_updated_at on report_brand_kits; create trigger trg_report_brand_kits_updated_at before update on report_brand_kits for each row execute function set_updated_at();
drop trigger if exists trg_report_studio_pages_updated_at on report_studio_pages; create trigger trg_report_studio_pages_updated_at before update on report_studio_pages for each row execute function set_updated_at();
drop trigger if exists trg_report_studio_blocks_updated_at on report_studio_blocks; create trigger trg_report_studio_blocks_updated_at before update on report_studio_blocks for each row execute function set_updated_at();
alter table report_brand_kits enable row level security; alter table report_studio_pages enable row level security; alter table report_studio_blocks enable row level security;
alter table report_block_evidence enable row level security; alter table report_cross_references enable row level security; alter table report_narrative_generations enable row level security;

insert into permissions(id,key,description) values
 ('perm-report-studio','report.studio','Compose report pages, blocks, branding, evidence, and versions'),
 ('perm-report-ai-narrative','report.ai_narrative','Draft grounded report narrative with the configured local model')
on conflict(id) do update set key=excluded.key,description=excluded.description;
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p where r.id in ('role-super-admin','role-platform-admin','role-organisation-admin','role-sustainability-manager') and p.key in ('report.studio','report.ai_narrative') on conflict do nothing;
delete from role_permissions where role_id='role-auditor' and permission_id in (select id from permissions where key in ('report.studio','report.ai_narrative'));

insert into entitlements(id,category_id,key,name,description) values
 ('ent-reports-studio','cat-reports','reports.studio','ESG Reporting Studio','Compose branded, versioned, evidence-linked board reports.'),
 ('ent-reports-ai-narrative','cat-ai','reports.ai_narrative','Report narrative drafting','Draft report narrative from verified tenant data using the configured model.')
on conflict(id) do update set name=excluded.name,description=excluded.description;
insert into plan_entitlements(plan_id,entitlement_id)
select mapping.plan_id,entitlement.id from (values
 ('plan-professional','reports.studio'),('plan-professional','reports.ai_narrative'),
 ('plan-enterprise','reports.studio'),('plan-enterprise','reports.ai_narrative')
) mapping(plan_id,entitlement_key) join entitlements entitlement on entitlement.key=mapping.entitlement_key on conflict do nothing;

insert into compliance_frameworks(id,key,name,status,description) values
 ('framework-integrated','INTEGRATED','Integrated Annual Report','active','Board-ready integrated annual reporting structure'),
 ('framework-ghg','GHG_PROTOCOL','GHG Protocol','active','Corporate greenhouse gas inventory and methodology disclosure'),
 ('framework-tcfd','TCFD','Task Force on Climate-related Financial Disclosures','active','Climate governance, strategy, risk, metrics and targets'),
 ('framework-secr','SECR','Streamlined Energy and Carbon Reporting','active','UK energy and carbon disclosure structure')
on conflict(id) do update set name=excluded.name,status=excluded.status,description=excluded.description;
update compliance_frameworks set status='active' where key in ('CDP','GRI','ISSB','CSRD');

insert into report_templates(id,organisation_id,framework_id,name,report_type,description,structure,is_system_template,status) values
 ('template-integrated-board-v1',null,'framework-integrated','Integrated annual report','Integrated Annual Report','Board-ready integrated report with leadership, performance, risk and roadmap sections','[{"key":"cover","title":"Integrated Annual Report","sectionType":"cover","narrative":"Reporting period and organisation identity."},{"key":"chair-message","title":"Chairman and CEO message","sectionType":"narrative","narrative":"Leadership perspective grounded in approved performance."},{"key":"highlights","title":"Performance highlights","sectionType":"emissions-inventory","narrative":"Key carbon, energy and production outcomes."},{"key":"risk","title":"Climate risk and governance","sectionType":"narrative","narrative":"Governance, risks, controls and evidence."},{"key":"roadmap","title":"Sustainability roadmap","sectionType":"narrative","narrative":"Projects, targets and forward actions."}]'::jsonb,true,'active'),
 ('template-ghg-protocol-v1',null,'framework-ghg','GHG Protocol inventory report','GHG Protocol','Corporate inventory, boundaries, methodology, factors and evidence','[{"key":"inventory","title":"GHG inventory","sectionType":"emissions-inventory","narrative":"Scope 1 and Scope 2 inventory."},{"key":"boundaries","title":"Organisational and operational boundaries","sectionType":"narrative","narrative":"Boundary and consolidation approach."},{"key":"methodology","title":"Methodology and emission factors","sectionType":"evidence-quality","narrative":"Calculation lineage, factors and evidence."}]'::jsonb,true,'active'),
 ('template-tcfd-v1',null,'framework-tcfd','TCFD climate disclosure','TCFD','Climate governance, strategy, risk management, metrics and targets','[{"key":"governance","title":"Governance","sectionType":"narrative","narrative":"Climate oversight and management."},{"key":"strategy","title":"Strategy","sectionType":"narrative","narrative":"Climate impacts and strategic response."},{"key":"risk","title":"Risk management","sectionType":"narrative","narrative":"Identification and management of climate risk."},{"key":"metrics","title":"Metrics and targets","sectionType":"emissions-inventory","narrative":"Emissions, intensity and targets."}]'::jsonb,true,'active'),
 ('template-gri-v1',null,'framework-gri','GRI sustainability report','GRI','Material-topic sustainability reporting with environmental performance','[{"key":"profile","title":"Organisation profile","sectionType":"narrative","narrative":"Organisation and reporting practices."},{"key":"energy","title":"GRI 302 Energy","sectionType":"energy-performance","narrative":"Energy performance."},{"key":"emissions","title":"GRI 305 Emissions","sectionType":"emissions-inventory","narrative":"GHG emissions and reductions."}]'::jsonb,true,'active'),
 ('template-issb-v1',null,'framework-issb','ISSB climate disclosure','ISSB','Investor-oriented climate-related financial disclosure','[{"key":"governance","title":"Governance","sectionType":"narrative","narrative":"Governance processes and controls."},{"key":"strategy","title":"Strategy","sectionType":"narrative","narrative":"Climate risks and opportunities."},{"key":"metrics","title":"Metrics and targets","sectionType":"emissions-inventory","narrative":"GHG metrics and targets."}]'::jsonb,true,'active'),
 ('template-csrd-v1',null,'framework-csrd','CSRD climate report','CSRD','ESRS-aligned climate reporting architecture','[{"key":"double-materiality","title":"Double materiality context","sectionType":"narrative","narrative":"Impact and financial materiality context."},{"key":"e1","title":"ESRS E1 Climate change","sectionType":"emissions-inventory","narrative":"Transition plan, metrics and targets."}]'::jsonb,true,'active'),
 ('template-secr-v1',null,'framework-secr','SECR energy and carbon report','SECR','Energy use, emissions, intensity and efficiency actions','[{"key":"energy","title":"Energy consumption","sectionType":"energy-performance","narrative":"Energy use and sources."},{"key":"carbon","title":"GHG emissions","sectionType":"emissions-inventory","narrative":"Scope emissions and intensity."},{"key":"actions","title":"Energy efficiency actions","sectionType":"narrative","narrative":"Actions taken and planned."}]'::jsonb,true,'active')
on conflict(id) do update set name=excluded.name,description=excluded.description,structure=excluded.structure,status='active';
