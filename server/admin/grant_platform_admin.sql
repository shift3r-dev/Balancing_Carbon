-- Run this once in the Supabase SQL editor after replacing the email below.
-- This is intentionally not a migration: platform ownership is environment-specific.
do $$
declare
  owner_email text := 'replace-with-owner-email@example.com';
  target_user_id uuid;
  target_organisation_id text;
begin
  select id into target_user_id
  from auth.users
  where lower(email) = lower(owner_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No authenticated user was found for %', owner_email;
  end if;

  select organisation_id into target_organisation_id
  from public.profiles
  where id = target_user_id
  limit 1;

  if target_organisation_id is null then
    raise exception 'The user does not have an organisation profile.';
  end if;

  insert into public.user_roles (id, user_id, role_id, organisation_id)
  values (
    'user-role-platform-' || replace(target_user_id::text, '-', ''),
    target_user_id,
    'role-platform-admin',
    target_organisation_id
  )
  on conflict (user_id, role_id, organisation_id)
  do update set deleted_at = null, updated_at = now();
end $$;

select
  u.email,
  p.organisation_id,
  r.name as platform_role
from auth.users u
join public.profiles p on p.id = u.id
join public.user_roles ur on ur.user_id = u.id and ur.organisation_id = p.organisation_id and ur.deleted_at is null
join public.roles r on r.id = ur.role_id
where r.id = 'role-platform-admin'
order by u.email;
