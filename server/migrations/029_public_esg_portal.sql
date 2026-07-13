-- Formal Phase 13: Public ESG Portal. Apply after 028.
create table if not exists public_esg_portals (
  id text primary key,
  organisation_id text not null unique references organisations(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  status text not null default 'draft' check (status in ('draft','published','unpublished')),
  enabled_sections jsonb not null default '["overview","carbon","esg","targets","reports","commitments"]'::jsonb,
  content jsonb not null default '{"commitments":[],"policies":[],"certificates":[]}'::jsonb,
  theme jsonb not null default '{"primaryColor":"#173f2a","accentColor":"#d39b35"}'::jsonb,
  published_snapshot jsonb,
  snapshot_version integer not null default 0,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public_portal_assets (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  portal_id text not null references public_esg_portals(id) on delete cascade,
  asset_type text not null check (asset_type in ('report','document','policy','certificate')),
  asset_id text,
  title text not null,
  summary text not null default '',
  display_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public_portal_publications (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  portal_id text not null references public_esg_portals(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  change_summary text not null default '',
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  unique(portal_id,version)
);
create index if not exists idx_public_portal_assets on public_portal_assets(organisation_id,portal_id,display_order);
create index if not exists idx_public_portal_publications on public_portal_publications(portal_id,version desc);
drop trigger if exists trg_public_esg_portals_updated_at on public_esg_portals;
create trigger trg_public_esg_portals_updated_at before update on public_esg_portals for each row execute function set_updated_at();
alter table public_esg_portals enable row level security;
alter table public_portal_assets enable row level security;
alter table public_portal_publications enable row level security;
insert into permissions(id,key,description) values
 ('perm-public-portal-view','public_portal.view','View and preview the organisation public ESG portal'),
 ('perm-public-portal-manage','public_portal.manage','Configure public portal content and selected assets'),
 ('perm-public-portal-publish','public_portal.publish','Publish or withdraw public ESG portal snapshots')
on conflict(id) do update set key=excluded.key,description=excluded.description;
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p where r.id in ('role-super-admin','role-platform-admin','role-organisation-admin','role-sustainability-manager') and p.key in ('public_portal.view','public_portal.manage','public_portal.publish') on conflict do nothing;
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p where r.id='role-auditor' and p.key='public_portal.view' on conflict do nothing;
insert into entitlements(id,category_id,key,name,description) values ('ent-public-esg-portal','cat-compliance','public.portal','Public ESG Portal','Publish governed carbon, ESG, target, report, certificate, policy and commitment snapshots.') on conflict(id) do update set name=excluded.name,description=excluded.description;
insert into plan_entitlements(plan_id,entitlement_id) select p.id,e.id from plans p cross join entitlements e where p.id='plan-enterprise' and e.key='public.portal' on conflict do nothing;
