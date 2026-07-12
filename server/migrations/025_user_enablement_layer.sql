-- Phase 10: user enablement, onboarding and product adoption.
-- Apply after 024. Additive and safe to rerun.

create table if not exists user_enablement_progress (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  item_type text not null default 'task' check(item_type in ('task','tour','guide','preference')),
  status text not null default 'started' check(status in ('started','completed','dismissed')),
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(organisation_id,user_id,item_key)
);

create index if not exists idx_user_enablement_progress_owner on user_enablement_progress(organisation_id,user_id,item_type,status);
drop trigger if exists trg_user_enablement_progress_updated_at on user_enablement_progress;
create trigger trg_user_enablement_progress_updated_at before update on user_enablement_progress for each row execute function set_updated_at();
alter table user_enablement_progress enable row level security;

drop policy if exists user_enablement_progress_select_self on user_enablement_progress;
create policy user_enablement_progress_select_self on user_enablement_progress for select to authenticated
using(user_id=auth.uid() and organisation_id=(select organisation_id from profiles where id=auth.uid()));
drop policy if exists user_enablement_progress_insert_self on user_enablement_progress;
create policy user_enablement_progress_insert_self on user_enablement_progress for insert to authenticated
with check(user_id=auth.uid() and organisation_id=(select organisation_id from profiles where id=auth.uid()));
drop policy if exists user_enablement_progress_update_self on user_enablement_progress;
create policy user_enablement_progress_update_self on user_enablement_progress for update to authenticated
using(user_id=auth.uid() and organisation_id=(select organisation_id from profiles where id=auth.uid()))
with check(user_id=auth.uid() and organisation_id=(select organisation_id from profiles where id=auth.uid()));

grant select,insert,update on user_enablement_progress to authenticated;
