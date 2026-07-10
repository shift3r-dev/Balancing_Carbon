-- Phase 2: database-driven authentication and authorization.
-- Apply after 004. Existing profiles remain valid and are backfilled into membership/RBAC records.

create table if not exists user_roles (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id text not null references roles(id) on delete cascade,
  organisation_id text references organisations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, role_id, organisation_id)
);

alter table profiles add column if not exists avatar_url text default '';
alter table profiles add column if not exists department text default '';
alter table profiles add column if not exists designation text default '';
alter table profiles add column if not exists phone text default '';
alter table profiles add column if not exists time_zone text default 'Asia/Kolkata';
alter table profiles add column if not exists language text default 'en';
alter table profiles add column if not exists status text not null default 'active';
alter table profiles add column if not exists last_login_at timestamptz;

create table if not exists auth_events (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  organisation_id text references organisations(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists organization_invitations (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  email text not null,
  role_id text references roles(id) on delete set null,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

insert into roles (id, name, description) values
  ('role-super-admin', 'Super Admin', 'Full platform access'),
  ('role-platform-admin', 'Platform Admin', 'Platform operations access'),
  ('role-support', 'Support', 'Support access'),
  ('role-organisation-admin', 'Organization Admin', 'Organisation administration access'),
  ('role-sustainability-manager', 'Sustainability Manager', 'Sustainability programme management'),
  ('role-plant-manager', 'Plant Manager', 'Facility management access'),
  ('role-operator', 'Operator', 'Operational data entry access'),
  ('role-auditor', 'Auditor', 'Read-only audit access'),
  ('role-developer', 'Developer', 'Integration development access')
on conflict (id) do update set name = excluded.name, description = excluded.description;

insert into permissions (id, key, description) values
  ('perm-dashboard-view', 'dashboard.view', 'View dashboard'),
  ('perm-facility-create', 'facility.create', 'Create facilities'), ('perm-facility-edit', 'facility.edit', 'Edit facilities'), ('perm-facility-delete', 'facility.delete', 'Delete facilities'),
  ('perm-activity-create', 'activity.create', 'Create activity records'), ('perm-activity-edit', 'activity.edit', 'Edit activity records'), ('perm-activity-delete', 'activity.delete', 'Delete activity records'),
  ('perm-report-generate', 'report.generate', 'Generate reports'), ('perm-report-export', 'report.export', 'Export reports'),
  ('perm-document-upload', 'document.upload', 'Upload documents'), ('perm-document-delete', 'document.delete', 'Delete documents'),
  ('perm-project-create', 'project.create', 'Create projects'), ('perm-project-edit', 'project.edit', 'Edit projects'), ('perm-project-delete', 'project.delete', 'Delete projects'),
  ('perm-settings-manage', 'settings.manage', 'Manage settings'), ('perm-organization-manage', 'organization.manage', 'Manage organization'),
  ('perm-billing-manage', 'billing.manage', 'Manage billing'), ('perm-subscription-manage', 'subscription.manage', 'Manage subscriptions'),
  ('perm-admin-access', 'admin.access', 'Access administration'), ('perm-audit-view', 'audit.view', 'View audit events'),
  ('perm-ai-use', 'ai.use', 'Use AI features'), ('perm-api-use', 'api.use', 'Use API')
on conflict (id) do update set key = excluded.key, description = excluded.description;

-- Role permissions are data, not application hardcoding. Platform and organisation admins receive the current application capability set.
insert into role_permissions (role_id, permission_id)
select target.role_id, permissions.id from (values
  ('role-super-admin'), ('role-platform-admin'), ('role-organisation-admin')
) as target(role_id) cross join permissions
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select 'role-sustainability-manager', id from permissions where key in ('dashboard.view', 'facility.create', 'facility.edit', 'activity.create', 'activity.edit', 'report.generate', 'report.export', 'document.upload', 'project.create', 'project.edit', 'api.use')
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select 'role-plant-manager', id from permissions where key in ('dashboard.view', 'facility.edit', 'activity.create', 'activity.edit', 'document.upload', 'project.create', 'project.edit', 'api.use')
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select 'role-operator', id from permissions where key in ('dashboard.view', 'activity.create', 'document.upload', 'api.use')
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select 'role-auditor', id from permissions where key in ('dashboard.view', 'report.export', 'audit.view', 'api.use')
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select 'role-support', id from permissions where key in ('dashboard.view', 'audit.view', 'api.use')
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select 'role-developer', id from permissions where key in ('dashboard.view', 'api.use')
on conflict do nothing;

insert into organization_members (id, organisation_id, user_id, role_id)
select 'member-' || replace(p.id::text, '-', ''), p.organisation_id, p.id, 'role-organisation-admin'
from profiles p
on conflict (organisation_id, user_id) do nothing;

insert into user_roles (id, user_id, role_id, organisation_id)
select 'user-role-' || replace(p.id::text, '-', ''), p.id, 'role-organisation-admin', p.organisation_id
from profiles p
on conflict (user_id, role_id, organisation_id) do nothing;

create index if not exists idx_user_roles_user_org on user_roles(user_id, organisation_id) where deleted_at is null;
create index if not exists idx_auth_events_user on auth_events(user_id, created_at desc);
create index if not exists idx_auth_events_org on auth_events(organisation_id, created_at desc);
create index if not exists idx_invitations_org on organization_invitations(organisation_id, status) where deleted_at is null;

drop trigger if exists trg_user_roles_updated_at on user_roles;
create trigger trg_user_roles_updated_at before update on user_roles for each row execute function set_updated_at();
drop trigger if exists trg_organization_invitations_updated_at on organization_invitations;
create trigger trg_organization_invitations_updated_at before update on organization_invitations for each row execute function set_updated_at();

alter table user_roles enable row level security;
alter table auth_events enable row level security;
alter table organization_invitations enable row level security;
