-- Enterprise pricing catalog and administrator configuration.

alter table plans add column if not exists value_proposition text not null default '';
alter table plans add column if not exists target_audience jsonb not null default '[]'::jsonb;
alter table plans add column if not exists cta_label text not null default 'Get started';
alter table plans add column if not exists cta_action text not null default 'register';
alter table plans add column if not exists contact_sales boolean not null default false;
alter table plans add column if not exists regional_prices jsonb not null default '{}'::jsonb;
alter table plans add column if not exists visible boolean not null default true;
alter table plans add column if not exists promotion jsonb not null default '{}'::jsonb;

create table if not exists pricing_addons (
  id text primary key,
  addon_key text not null unique,
  name text not null,
  description text not null default '',
  benefit text not null default '',
  pricing_label text not null default 'Custom quote',
  category text not null default 'Modules',
  configuration jsonb not null default '{}'::jsonb,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists implementation_services (
  id text primary key,
  service_key text not null unique,
  name text not null,
  description text not null default '',
  pricing_label text not null default 'Custom Quote',
  configuration jsonb not null default '{}'::jsonb,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

insert into plans (id,name,slug,description,value_proposition,target_audience,monthly_price,yearly_price,currency,trial_days,recommended,badge,cta_label,cta_action,contact_sales,regional_prices,visible,active,sort_order,promotion) values
('plan-free','Free','free','A governed starting point for learning, evaluation and early carbon measurement.','Build your first facility inventory without a time-limited trial.','["Students","Startups","Learning teams","Evaluation"]',0,0,'INR',0,false,'Free forever','Start Free','register',false,'{"IN":{"currency":"INR","monthly":0,"yearly":0}}',true,true,1,'{}'),
('plan-starter','Starter','starter','Practical carbon operations for small manufacturers and growing businesses.','Move electricity bills and spreadsheets into a repeatable reporting workflow.','["Small manufacturers","SMEs","Growing businesses"]',9999,99990,'INR',14,false,'','Start Trial','register',false,'{"IN":{"currency":"INR","monthly":9999,"yearly":99990}}',true,true,2,'{"annualSavingsPercent":17}'),
('plan-professional','Professional','professional','Complete carbon intelligence for medium manufacturing companies and multi-team programmes.','Connect facilities, suppliers, approvals, reporting and AI-assisted analysis in one governed platform.','["Medium manufacturers","Multi-facility teams","Sustainability leaders"]',49999,499990,'INR',0,true,'Recommended','Book Demo','demo',false,'{"IN":{"currency":"INR","monthly":49999,"yearly":499990}}',true,true,3,'{"label":"Most selected","annualSavingsPercent":17}'),
('plan-enterprise','Enterprise','enterprise','A configurable operating model for complex, regulated and infrastructure-intensive enterprises.','Deploy at enterprise scale with dedicated architecture, integrations, controls and success ownership.','["Steel and cement","Automotive and chemicals","Mining and energy","Large manufacturers"]',0,0,'INR',0,false,'Custom','Talk to Sales','sales',true,'{"IN":{"currency":"INR","monthly":null,"yearly":null}}',true,true,4,'{}')
on conflict(id) do update set name=excluded.name,slug=excluded.slug,description=excluded.description,value_proposition=excluded.value_proposition,target_audience=excluded.target_audience,monthly_price=excluded.monthly_price,yearly_price=excluded.yearly_price,currency=excluded.currency,trial_days=excluded.trial_days,recommended=excluded.recommended,badge=excluded.badge,cta_label=excluded.cta_label,cta_action=excluded.cta_action,contact_sales=excluded.contact_sales,regional_prices=excluded.regional_prices,visible=excluded.visible,active=excluded.active,sort_order=excluded.sort_order,promotion=excluded.promotion;

delete from plan_features where plan_id in ('plan-free','plan-starter','plan-professional','plan-enterprise');
with plan_tiers(plan_id,tier) as (values ('plan-free',0),('plan-starter',1),('plan-professional',2),('plan-enterprise',3)),
feature_catalog(feature_key,label,category,min_tier,enterprise_custom,position) as (values
('scope_1','Scope 1','Carbon accounting',0,false,1),('scope_2','Scope 2','Carbon accounting',0,false,2),('scope_3','Scope 3','Carbon accounting',1,false,3),
('ai_copilot','AI Carbon Copilot','AI and automation',2,false,4),('ai_ocr','AI OCR','AI and automation',1,false,5),
('brsr','BRSR','Reporting',1,false,6),('gri','GRI','Reporting',2,false,7),('cbam','CBAM','Reporting',2,false,8),('ifrs','IFRS S2','Reporting',3,true,9),('csrd','CSRD','Reporting',3,true,10),
('supplier_portal','Supplier Portal','Value chain',2,false,11),('api','API Access','Integrations',2,false,12),('erp','ERP Imports','Integrations',2,false,13),('sap','SAP Integration','Integrations',3,true,14),('iot','IoT and Smart Meters','Integrations',3,true,15),
('audit_trail','Audit Trail','Governance',2,false,16),('reports','Reports','Governance',0,false,17),('dashboards','Dashboards','Governance',0,false,18),('storage','Storage','Platform',0,false,19),('support','Support','Platform',0,false,20),
('sso','SSO','Security',3,true,21),('security','Security Review','Security',3,true,22),('custom_ai','Custom AI Models','AI and automation',3,true,23))
insert into plan_features(id,plan_id,feature_key,label,category,availability,sort_order)
select 'feature-'||p.plan_id||'-'||f.feature_key,p.plan_id,f.feature_key,f.label,f.category,case when p.tier=3 and f.enterprise_custom then 'custom' when p.tier>=f.min_tier then 'included' else 'not-included' end,f.position
from plan_tiers p cross join feature_catalog f;

delete from plan_limits where plan_id in ('plan-free','plan-starter','plan-professional','plan-enterprise');
insert into plan_limits(id,plan_id,limit_key,value_type,numeric_value,display_value,unit) values
('limit-free-facilities','plan-free','facilities','number',1,'1','facility'),('limit-free-users','plan-free','team_members','number',1,'1','member'),('limit-free-ocr','plan-free','ocr_pages_month','number',50,'50','pages/month'),('limit-free-ai','plan-free','ai_reports_month','number',2,'2','reports/month'),('limit-free-storage','plan-free','storage_gb','number',1,'1 GB','storage'),('limit-free-api','plan-free','api_calls_month','number',0,'Not included','calls/month'),('limit-free-plants','plan-free','plants','number',1,'1','plant'),
('limit-starter-facilities','plan-starter','facilities','number',3,'3','facilities'),('limit-starter-users','plan-starter','team_members','number',5,'5','members'),('limit-starter-ocr','plan-starter','ocr_pages_month','number',500,'500','pages/month'),('limit-starter-ai','plan-starter','ai_reports_month','number',20,'20','reports/month'),('limit-starter-storage','plan-starter','storage_gb','number',20,'20 GB','storage'),('limit-starter-api','plan-starter','api_calls_month','number',0,'Not included','calls/month'),('limit-starter-plants','plan-starter','plants','number',3,'3','plants'),
('limit-pro-facilities','plan-professional','facilities','unlimited',null,'Unlimited','facilities'),('limit-pro-users','plan-professional','team_members','number',50,'50','members'),('limit-pro-ocr','plan-professional','ocr_pages_month','number',5000,'5,000','pages/month'),('limit-pro-ai','plan-professional','ai_reports_month','unlimited',null,'Unlimited','reports'),('limit-pro-storage','plan-professional','storage_gb','number',100,'100 GB','storage'),('limit-pro-api','plan-professional','api_calls_month','number',100000,'100,000','calls/month'),('limit-pro-plants','plan-professional','plants','unlimited',null,'Unlimited','plants'),
('limit-enterprise-facilities','plan-enterprise','facilities','unlimited',null,'Unlimited','facilities'),('limit-enterprise-users','plan-enterprise','team_members','unlimited',null,'Unlimited','members'),('limit-enterprise-ocr','plan-enterprise','ocr_pages_month','unlimited',null,'Unlimited','pages'),('limit-enterprise-ai','plan-enterprise','ai_reports_month','unlimited',null,'Unlimited','reports'),('limit-enterprise-storage','plan-enterprise','storage_gb','unlimited',null,'Unlimited','storage'),('limit-enterprise-api','plan-enterprise','api_calls_month','custom',null,'Custom','calls'),('limit-enterprise-plants','plan-enterprise','plants','unlimited',null,'Unlimited','plants');

insert into pricing_addons(id,addon_key,name,description,benefit,pricing_label,category,visible,sort_order) values
('addon-ai-copilot','ai-copilot','AI Carbon Copilot','Grounded assistance across governed carbon data and evidence.','Reduce analysis and drafting time while retaining human review.','From custom quote','AI',true,1),
('addon-supplier-portal','supplier-portal','Supplier Portal','Structured supplier data requests, assessments and evidence exchange.','Improve Scope 3 data coverage and supplier engagement.','From custom quote','Value chain',true,2),
('addon-cbam','cbam','CBAM','Product and installation-level embedded emissions workflows.','Prepare traceable export reporting and review packages.','Custom quote','Compliance',true,3),
('addon-lca','lca','Life Cycle Assessment','Lifecycle inventory and impact modelling workspace.','Extend accounting into product and process decisions.','Custom quote','Product carbon',true,4),
('addon-pcf','pcf','Product Carbon Footprint','Product-level footprint calculation and evidence lineage.','Respond to customer and value-chain data requests.','Custom quote','Product carbon',true,5),
('addon-net-zero','net-zero','Net Zero Planner','Targets, scenarios, pathways and project tracking.','Connect commitments to measurable operational action.','Custom quote','Planning',true,6),
('addon-marketplace','marketplace','Carbon Credit Marketplace','Governed project and credit catalogue integration.','Support controlled evaluation without mixing offsets into inventory.','Custom quote','Marketplace',true,7),
('addon-energy','energy','Energy Management','Energy ledgers, intensity analysis and opportunity tracking.','Connect energy cost and carbon performance.','Custom quote','Operations',true,8),
('addon-water','water','Water Management','Withdrawal, discharge, quality and stress-context ledgers.','Coordinate water performance and disclosures.','Custom quote','Operations',true,9),
('addon-waste','waste','Waste Management','Waste stream, treatment and circularity tracking.','Improve waste evidence and Scope 3 Category 5 data.','Custom quote','Operations',true,10),
('addon-iot','iot','IoT Integration','Smart meter, sensor and SCADA ingestion pipelines.','Reduce manual collection and improve data frequency.','Custom quote','Integrations',true,11),
('addon-erp','erp','ERP Integration','Controlled imports from ERP and finance systems.','Connect operational and purchasing data at scale.','Custom quote','Integrations',true,12),
('addon-custom-api','custom-api','Custom API','Purpose-built endpoints, schemas and workflow integration.','Embed carbon intelligence into existing operations.','Custom quote','Integrations',true,13),
('addon-branding','branding','Custom Branding','Branded portals, reports and stakeholder outputs.','Deliver a consistent customer-facing experience.','Custom quote','Experience',true,14),
('addon-storage','storage','Additional Storage','Additional governed document and evidence capacity.','Retain larger reporting and assurance archives.','Usage based','Capacity',true,15),
('addon-ai-credits','ai-credits','Additional AI Credits','Additional governed AI and extraction capacity.','Scale document and analysis workloads.','Usage based','Capacity',true,16),
('addon-consulting','consulting','Consulting','Climate, reporting and implementation advisory support.','Accelerate decisions and programme design.','Custom quote','Services',true,17),
('addon-training','training','Training','Role-based administrator and practitioner enablement.','Improve adoption and operating consistency.','Custom quote','Services',true,18)
on conflict(addon_key) do update set name=excluded.name,description=excluded.description,benefit=excluded.benefit,pricing_label=excluded.pricing_label,category=excluded.category,visible=excluded.visible,sort_order=excluded.sort_order,updated_at=now();

insert into implementation_services(id,service_key,name,description,pricing_label,visible,sort_order) values
('service-data-migration','data-migration','Data Migration','Clean, map and transfer existing activity, facility and evidence records.','Custom Quote',true,1),('service-erp-integration','erp-integration','ERP Integration','Design governed imports from finance, procurement and operations systems.','Custom Quote',true,2),('service-sap-integration','sap-integration','SAP Integration','Map relevant SAP objects and controlled carbon data pipelines.','Custom Quote',true,3),('service-inventory-setup','inventory-setup','Carbon Inventory Setup','Establish boundaries, facilities, sources, categories and review workflows.','Custom Quote',true,4),('service-factor-customization','factor-customization','Emission Factor Customization','Configure approved regional, supplier and organization-specific factors.','Custom Quote',true,5),('service-brsr-setup','brsr-setup','BRSR Setup','Configure indicators, evidence responsibilities and report preparation.','Custom Quote',true,6),('service-training','training','Training','Enable administrators, contributors, reviewers and executives.','Custom Quote',true,7),('service-implementation','implementation','Implementation','Plan and deliver a phased production rollout.','Custom Quote',true,8),('service-net-zero-strategy','net-zero-strategy','Net Zero Strategy','Develop targets, scenarios, pathways and a governed action portfolio.','Custom Quote',true,9)
on conflict(service_key) do update set name=excluded.name,description=excluded.description,pricing_label=excluded.pricing_label,visible=excluded.visible,sort_order=excluded.sort_order,updated_at=now();

create index if not exists idx_pricing_addons_visible on pricing_addons(visible,sort_order) where deleted_at is null;
create index if not exists idx_implementation_services_visible on implementation_services(visible,sort_order) where deleted_at is null;
drop trigger if exists trg_pricing_addons_updated_at on pricing_addons; create trigger trg_pricing_addons_updated_at before update on pricing_addons for each row execute function set_updated_at();
drop trigger if exists trg_implementation_services_updated_at on implementation_services; create trigger trg_implementation_services_updated_at before update on implementation_services for each row execute function set_updated_at();
alter table pricing_addons enable row level security;
alter table implementation_services enable row level security;
