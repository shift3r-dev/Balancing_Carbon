-- Phase 8: local-first AI Carbon Copilot governance and conversation ownership.
-- Apply after 021. Additive and safe to rerun.

alter table ai_conversations add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table ai_conversations add column if not exists provider text not null default 'ollama';
alter table ai_conversations add column if not exists model text not null default '';
alter table ai_conversations add column if not exists archived_at timestamptz;

create table if not exists ai_usage_events (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  conversation_id text references ai_conversations(id) on delete set null,
  provider text not null,
  model text not null,
  status text not null check (status in ('completed','failed','blocked')),
  prompt_tokens integer,
  completion_tokens integer,
  duration_ms integer not null default 0,
  error_code text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_conversations_owner on ai_conversations(organisation_id, created_by, last_updated desc) where archived_at is null;
create index if not exists idx_ai_usage_org_date on ai_usage_events(organisation_id, created_at desc);

insert into permissions(id,key,description) values
  ('perm-ai-use','ai.use','Use the tenant-scoped Carbon Copilot')
on conflict(id) do update set key=excluded.key, description=excluded.description;

insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p
where r.id in ('role-super-admin','role-platform-admin','role-organisation-admin','role-sustainability-manager','role-plant-manager')
  and p.key='ai.use'
on conflict do nothing;

alter table ai_usage_events enable row level security;

