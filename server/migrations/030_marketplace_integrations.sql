-- Formal Phase 14: Marketplace and Integrations. Apply after 029.
create table if not exists marketplace_items (
 id text primary key, item_key text not null unique, name text not null, category text not null check(category in ('industry-pack','template','widget','factor-pack','connector','ai-model','plugin')),
 description text not null default '', publisher text not null default 'Balancing Carbon', version text not null default '1.0.0', status text not null default 'preview' check(status in ('available','preview','deprecated','disabled')),
 entitlement_key text, manifest jsonb not null default '{}'::jsonb, capabilities jsonb not null default '[]'::jsonb, icon_key text not null default 'package', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists marketplace_installations (
 id text primary key, organisation_id text not null references organisations(id) on delete cascade, marketplace_item_id text not null references marketplace_items(id) on delete restrict,
 installed_version text not null, status text not null default 'installed' check(status in ('installed','disabled','upgrade-available','uninstalled')), configuration jsonb not null default '{}'::jsonb,
 installed_by uuid references auth.users(id) on delete set null, installed_at timestamptz not null default now(), updated_at timestamptz not null default now(), uninstalled_at timestamptz, unique(organisation_id,marketplace_item_id)
);
create table if not exists developer_api_credentials (
 id text primary key, organisation_id text not null references organisations(id) on delete cascade, name text not null, key_prefix text not null, secret_hash text not null unique,
 scopes jsonb not null default '[]'::jsonb, status text not null default 'active' check(status in ('active','revoked','expired')), expires_at timestamptz, last_used_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), revoked_at timestamptz
);
create table if not exists webhook_subscriptions (
 id text primary key, organisation_id text not null references organisations(id) on delete cascade, name text not null, endpoint_url text not null, secret_hash text not null,
 event_types jsonb not null default '[]'::jsonb, status text not null default 'paused' check(status in ('paused','active','disabled')), api_version text not null default '2026-07-01',
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_delivery_at timestamptz
);
create table if not exists webhook_deliveries (
 id text primary key, organisation_id text not null references organisations(id) on delete cascade, webhook_id text not null references webhook_subscriptions(id) on delete cascade,
 event_type text not null, event_id text not null, status text not null default 'queued' check(status in ('queued','delivered','failed','cancelled')), attempt integer not null default 0,
 response_status integer, response_summary text not null default '', created_at timestamptz not null default now(), delivered_at timestamptz
);
create table if not exists developer_api_usage (
 id text primary key, organisation_id text not null references organisations(id) on delete cascade, credential_id text references developer_api_credentials(id) on delete set null,
 route text not null, status_code integer not null, request_id text not null default '', occurred_at timestamptz not null default now()
);
create index if not exists idx_marketplace_installations_org on marketplace_installations(organisation_id,status);
create index if not exists idx_developer_credentials_prefix on developer_api_credentials(key_prefix,status);
create index if not exists idx_webhook_subscriptions_org on webhook_subscriptions(organisation_id,status);
create index if not exists idx_developer_usage_org on developer_api_usage(organisation_id,occurred_at desc);
drop trigger if exists trg_marketplace_items_updated_at on marketplace_items;create trigger trg_marketplace_items_updated_at before update on marketplace_items for each row execute function set_updated_at();
drop trigger if exists trg_marketplace_installations_updated_at on marketplace_installations;create trigger trg_marketplace_installations_updated_at before update on marketplace_installations for each row execute function set_updated_at();
drop trigger if exists trg_webhook_subscriptions_updated_at on webhook_subscriptions;create trigger trg_webhook_subscriptions_updated_at before update on webhook_subscriptions for each row execute function set_updated_at();
alter table marketplace_items enable row level security;alter table marketplace_installations enable row level security;alter table developer_api_credentials enable row level security;alter table webhook_subscriptions enable row level security;alter table webhook_deliveries enable row level security;alter table developer_api_usage enable row level security;
insert into marketplace_items(id,item_key,name,category,description,status,manifest,capabilities,icon_key) values
 ('market-industry-automotive','industry.automotive','Automotive Supplier Pack','industry-pack','Facility metadata, supplier prompts, OEM evidence categories, and automotive KPI definitions.','available','{"type":"declarative","industry":"automotive"}','["metadata","oem","kpi"]','factory'),
 ('market-industry-cement','industry.cement','Cement and Clinker Pack','industry-pack','Calcination-aware metadata, clinker KPIs, and cement reporting structures.','available','{"type":"declarative","industry":"cement"}','["metadata","carbon","kpi"]','factory'),
 ('market-template-brsr','template.brsr','BRSR Reporting Templates','template','Balancing Carbon maintained BRSR report structures and evidence guidance.','available','{"type":"declarative","framework":"BRSR"}','["reporting","evidence"]','file'),
 ('market-widget-intensity','widget.carbon-intensity','Carbon Intensity Widget','widget','Configurable operational carbon-intensity visualization.','available','{"type":"declarative","widget":"carbon-intensity"}','["analytics","dashboard"]','chart'),
 ('market-factor-india','factors.india-cea','India CEA Factor Pack','factor-pack','Versioned Indian electricity-factor distribution package. Installation does not approve factors automatically.','preview','{"type":"data","approvalRequired":true}','["factors","provenance"]','database'),
 ('market-connector-sap','connector.sap','SAP Connector Definition','connector','Declarative SAP adapter contract. Customer credentials and licensed endpoints are required separately.','preview','{"type":"connector-reference","connectorKey":"sap","executesCode":false}','["erp","mapping"]','link'),
 ('market-connector-odoo','connector.odoo','Odoo Connector Definition','connector','Declarative Odoo adapter contract. No remote connection is activated by installation.','preview','{"type":"connector-reference","connectorKey":"odoo","executesCode":false}','["erp","mapping"]','link'),
 ('market-ai-qwen','ai.qwen-local','Qwen Local Model Profile','ai-model','Local Ollama model profile for grounded read-only assistance. No hosted AI API is connected.','available','{"type":"provider-profile","provider":"ollama","model":"qwen3:8b","remote":false}','["local-ai","copilot"]','bot')
on conflict(id) do update set name=excluded.name,description=excluded.description,status=excluded.status,manifest=excluded.manifest,capabilities=excluded.capabilities;
insert into permissions(id,key,description) values
 ('perm-marketplace-view','marketplace.view','View marketplace catalog and organisation installations'),('perm-marketplace-manage','marketplace.manage','Install, disable and remove marketplace packages'),
 ('perm-developer-manage','developer.manage','Manage scoped developer API credentials'),('perm-webhooks-manage','webhooks.manage','Manage webhook definitions and inspect delivery history')
on conflict(id) do update set key=excluded.key,description=excluded.description;
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permissions p where r.id in ('role-super-admin','role-platform-admin','role-organisation-admin') and p.key in ('marketplace.view','marketplace.manage','developer.manage','webhooks.manage') on conflict do nothing;
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permissions p where r.id in ('role-sustainability-manager','role-auditor') and p.key='marketplace.view' on conflict do nothing;
insert into entitlements(id,category_id,key,name,description) values
 ('ent-marketplace-catalog','cat-integration','marketplace.catalog','Marketplace Catalog','Install declarative industry packs, templates, widgets, factor packs and connector definitions.'),
 ('ent-developer-api','cat-integration','integration.developer_api','Developer API','Scoped API credentials, webhook definitions and developer contracts.')
on conflict(id) do update set category_id=excluded.category_id,name=excluded.name,description=excluded.description;
insert into plan_entitlements(plan_id,entitlement_id) select p.id,e.id from plans p cross join entitlements e where (p.id in ('plan-professional','plan-enterprise') and e.key='marketplace.catalog') or (p.id='plan-enterprise' and e.key='integration.developer_api') on conflict do nothing;
