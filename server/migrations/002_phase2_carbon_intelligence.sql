-- Phase 2: industrial diagnostics, scenarios, opportunities, and project tracking.
-- Safe additive migration. Does not delete or rewrite Phase 1 activity data.

create table if not exists diagnostic_question_responses (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  facility_id text references facilities(id) on delete cascade,
  question_id text not null,
  industry text not null,
  category text not null,
  question_text text not null,
  answer_type text not null check (answer_type in ('yes-no', 'select', 'number', 'text')),
  answer text not null default '',
  evidence_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_diag_responses_org on diagnostic_question_responses(organisation_id);
create index if not exists idx_diag_responses_facility on diagnostic_question_responses(facility_id);
create unique index if not exists idx_diag_responses_unique
  on diagnostic_question_responses(organisation_id, coalesce(facility_id, ''), question_id);

create table if not exists diagnostic_findings (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  facility_id text references facilities(id) on delete cascade,
  category text not null,
  finding_type text not null check (finding_type in ('fact', 'observation', 'questionnaire', 'investigation-area', 'data-gap')),
  severity text not null check (severity in ('info', 'low', 'medium', 'high')),
  title text not null,
  description text not null,
  metric_name text,
  current_value numeric,
  previous_value numeric,
  unit text,
  evidence jsonb not null default '{}'::jsonb,
  calculation_metadata jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_diag_findings_org on diagnostic_findings(organisation_id);
create index if not exists idx_diag_findings_facility on diagnostic_findings(facility_id);
create index if not exists idx_diag_findings_type on diagnostic_findings(finding_type, severity);

create table if not exists reduction_opportunities (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  facility_id text references facilities(id) on delete set null,
  diagnostic_finding_id text references diagnostic_findings(id) on delete set null,
  title text not null,
  category text not null,
  source text not null check (source in ('diagnostic', 'hotspot', 'manual', 'scenario')),
  description text not null,
  rationale text not null,
  status text not null default 'identified' check (status in ('identified', 'under-review', 'approved', 'rejected', 'converted-to-project')),
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  engineering_assessment_required boolean not null default true,
  estimated_annual_reduction_t_co2e numeric,
  estimated_annual_energy_savings numeric,
  energy_savings_unit text,
  estimated_capex numeric,
  estimated_annual_cost_savings numeric,
  simple_payback_years numeric,
  calculation_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reduction_opps_org on reduction_opportunities(organisation_id);
create index if not exists idx_reduction_opps_status on reduction_opportunities(status);

create table if not exists reduction_scenarios (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  facility_id text references facilities(id) on delete set null,
  title text not null,
  baseline_start_date date not null,
  baseline_end_date date not null,
  scenario_type text not null,
  assumptions jsonb not null default '{}'::jsonb,
  baseline_emissions_t_co2e numeric not null,
  scenario_emissions_t_co2e numeric not null,
  estimated_reduction_t_co2e numeric not null,
  estimated_reduction_percent numeric not null,
  calculation_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_reduction_scenarios_org on reduction_scenarios(organisation_id);
create index if not exists idx_reduction_scenarios_facility on reduction_scenarios(facility_id);

create table if not exists decarbonization_projects (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  facility_id text references facilities(id) on delete set null,
  opportunity_id text references reduction_opportunities(id) on delete set null,
  scenario_id text references reduction_scenarios(id) on delete set null,
  title text not null,
  description text not null,
  category text not null,
  status text not null default 'planned' check (status in ('planned', 'approved', 'in-progress', 'completed', 'on-hold', 'cancelled')),
  owner text,
  baseline_start_date date,
  baseline_end_date date,
  planned_start_date date,
  planned_completion_date date,
  actual_start_date date,
  actual_completion_date date,
  target_annual_reduction_t_co2e numeric,
  estimated_capex numeric,
  estimated_annual_cost_savings numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_org on decarbonization_projects(organisation_id);
create index if not exists idx_projects_status on decarbonization_projects(status);

create table if not exists project_milestones (
  id text primary key,
  project_id text not null references decarbonization_projects(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  completed_at date,
  status text not null default 'pending' check (status in ('pending', 'in-progress', 'completed', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_milestones_project on project_milestones(project_id);

create table if not exists project_measurements (
  id text primary key,
  project_id text not null references decarbonization_projects(id) on delete cascade,
  measurement_start_date date not null,
  measurement_end_date date not null,
  expected_reduction_percent numeric,
  baseline_intensity numeric,
  observed_intensity numeric,
  observed_improvement_percent numeric,
  variance_percentage_points numeric,
  methodology text not null default 'Observed performance change only; does not prove project causality.',
  calculation_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_measurements_project on project_measurements(project_id);
