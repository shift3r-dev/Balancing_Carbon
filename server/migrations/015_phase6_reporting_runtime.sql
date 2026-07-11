-- Phase 6 reporting runtime. Apply after 011, 012, and 013.
-- Adds workflow metadata to the legacy reports table and seeds usable templates/permissions.

alter table reports add column if not exists template_id text references report_templates(id) on delete set null;
alter table reports add column if not exists workflow_status text not null default 'draft' check (workflow_status in ('draft','under-review','approved','published','rejected','changes-requested','archived'));
alter table reports add column if not exists published_at timestamptz;
alter table reports add column if not exists archived_at timestamptz;
alter table reports add column if not exists tags jsonb not null default '[]'::jsonb;

create index if not exists idx_reports_workflow on reports(organisation_id, workflow_status, created_at desc) where archived_at is null;
create index if not exists idx_report_approvals_report on report_approvals(report_id, acted_at desc);
create index if not exists idx_report_schedules_org on report_schedules(organisation_id, active, next_run_at) where deleted_at is null;

insert into permissions (id, key, description) values
  ('perm-report-create', 'report.create', 'Create report templates'),
  ('perm-report-edit', 'report.edit', 'Edit and submit reports for review'),
  ('perm-report-review', 'report.review', 'Review report evidence and validation'),
  ('perm-report-approve', 'report.approve', 'Approve or reject reports'),
  ('perm-report-publish', 'report.publish', 'Publish approved reports'),
  ('perm-report-schedule', 'report.schedule', 'Configure report schedules')
on conflict (id) do update set key = excluded.key, description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.id in ('role-super-admin', 'role-platform-admin', 'role-organisation-admin')
  and p.key in ('report.generate', 'report.export', 'report.create', 'report.edit', 'report.review', 'report.approve', 'report.publish', 'report.schedule')
on conflict do nothing;
insert into role_permissions(role_id, permission_id)
select 'role-sustainability-manager', id from permissions where key in ('report.generate', 'report.export', 'report.create', 'report.edit', 'report.review', 'report.schedule')
on conflict do nothing;
insert into role_permissions(role_id, permission_id)
select 'role-auditor', id from permissions where key in ('report.export', 'report.review', 'report.approve')
on conflict do nothing;

insert into entitlements(id, category_id, key, name, description) values
  ('ent-reports-compliance', 'cat-reports', 'reports.compliance', 'Compliance reporting', 'Generate and manage BRSR and other framework-driven reports.')
on conflict (id) do update set name = excluded.name, description = excluded.description;
insert into plan_entitlements(plan_id, entitlement_id)
select mapping.plan_id, entitlement.id from (values
  ('plan-starter', 'reports.generate'), ('plan-starter', 'reports.export'),
  ('plan-professional', 'reports.generate'), ('plan-professional', 'reports.export'), ('plan-professional', 'reports.compliance'),
  ('plan-enterprise', 'reports.generate'), ('plan-enterprise', 'reports.export'), ('plan-enterprise', 'reports.compliance')
) as mapping(plan_id, entitlement_key)
join entitlements entitlement on entitlement.key = mapping.entitlement_key
on conflict do nothing;

insert into report_templates(id, organisation_id, framework_id, name, report_type, description, structure, is_system_template, status) values
  ('template-management-carbon-v1', null, null, 'Management carbon performance', 'Management Carbon Report', 'A decision-ready operating report based on current calculation lineage.',
   '[{"key":"executive-overview","title":"Executive carbon overview","sectionType":"overview","narrative":"Operational Scope 1 and Scope 2 emissions based on current calculation records."},{"key":"carbon-inventory","title":"Carbon inventory","sectionType":"emissions-inventory","narrative":"Scope 1 and Scope 2 emissions, facilities, and source contribution."},{"key":"data-quality","title":"Data quality and evidence","sectionType":"evidence-quality","narrative":"Evidence coverage, approval state, factor versions, and calculation references."}]'::jsonb, true, 'active'),
  ('template-brsr-environment-v1', null, 'framework-brsr', 'BRSR environmental disclosure', 'BRSR Environmental Disclosure', 'BRSR-first environmental reporting structure, ready for organisation-specific narrative and assurance review.',
   '[{"key":"principle-6","title":"Principle 6: Environmental stewardship","sectionType":"narrative","narrative":"Environmental performance narrative prepared from the organisation carbon inventory."},{"key":"ghg-inventory","title":"Greenhouse gas inventory","sectionType":"emissions-inventory","narrative":"Scope 1 and Scope 2 greenhouse gas inventory from current calculation records."},{"key":"energy-performance","title":"Energy and renewable energy performance","sectionType":"energy-performance","narrative":"Energy-related emissions source contribution and operational data coverage."},{"key":"evidence-methodology","title":"Evidence, methodology, and assurance readiness","sectionType":"evidence-quality","narrative":"Calculation lineage, factor versions, evidence links, and readiness validations."}]'::jsonb, true, 'active')
on conflict (id) do update set name = excluded.name, report_type = excluded.report_type, description = excluded.description, structure = excluded.structure, status = excluded.status;
