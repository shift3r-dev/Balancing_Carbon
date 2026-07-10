-- Balancing Carbon demo seed data.
-- Run after:
-- 1) Base schema
-- 2) 001_activity_carbon_engine.sql
-- 3) 002_phase2_carbon_intelligence.sql
--
-- How to use:
-- 1) Register a test user from the website first.
-- 2) Replace demo@balancingcarbon.test below with that registered email.
-- 3) Paste this whole file into Supabase SQL Editor and run.

do $$
declare
  target_email text := 'singhyuvr.aj1211@gmail.com';
  target_user_id uuid;
  org_id text;
begin
  select id into target_user_id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No Supabase Auth user found for %. Register this email in the website first, then rerun this seed.', target_email;
  end if;

  select organisation_id into org_id
  from profiles
  where id::text = target_user_id::text
  limit 1;

  if org_id is null then
    org_id := 'org-demo-apex-components';

    insert into organisations (
      id, name, industry, location, employee_count, reporting_year, target_reduction_percent
    ) values (
      org_id,
      'Apex Precision Components Pvt. Ltd.',
      'Automobile Components',
      'Pune, Maharashtra',
      420,
      'FY 2025-26',
      28
    )
    on conflict (id) do update set
      name = excluded.name,
      industry = excluded.industry,
      location = excluded.location,
      employee_count = excluded.employee_count,
      reporting_year = excluded.reporting_year,
      target_reduction_percent = excluded.target_reduction_percent;

    insert into profiles (id, full_name, organisation_id, role)
    values (target_user_id, 'Demo Plant Manager', org_id, 'organisation_admin')
    on conflict (id) do update set
      full_name = excluded.full_name,
      organisation_id = excluded.organisation_id,
      role = excluded.role;
  end if;

  update organisations
  set
    name = 'Apex Precision Components Pvt. Ltd.',
    industry = 'Automobile Components',
    location = 'Pune, Maharashtra',
    employee_count = 420,
    reporting_year = 'FY 2025-26',
    target_reduction_percent = 28
  where id = org_id;

  insert into facilities (
    id, organisation_id, name, location, industry_type, production_output, production_unit,
    reporting_period, electricity_consumption, fuel_consumption, fuel_type,
    renewable_energy_usage, emissions_scope_1, emissions_scope_2, carbon_intensity,
    esg_readiness_status
  ) values
    (
      'fac-demo-pune-press-shop', org_id, 'Pune Press Shop', 'Pune, Maharashtra',
      'Automobile Components', 18500, 'Tonnes', 'FY 2025-26',
      188000, 13800, 'Diesel', 26000, 36.984, 115.992, 0.0083, 'Good'
    ),
    (
      'fac-demo-chakan-machining', org_id, 'Chakan Machining Unit', 'Chakan, Maharashtra',
      'Precision Engineering', 12400, 'Tonnes', 'FY 2025-26',
      143000, 9200, 'Natural Gas', 18000, 18.584, 89.5, 0.0087, 'Needs Improvement'
    ),
    (
      'fac-demo-sanand-assembly', org_id, 'Sanand Assembly Line', 'Sanand, Gujarat',
      'OEM Tier-2 Assembly', 9600, 'Tonnes', 'FY 2025-26',
      98000, 6400, 'LPG', 30000, 9.664, 48.688, 0.0061, 'Excellent'
    )
  on conflict (id) do update set
    name = excluded.name,
    location = excluded.location,
    industry_type = excluded.industry_type,
    production_output = excluded.production_output,
    production_unit = excluded.production_unit,
    reporting_period = excluded.reporting_period,
    electricity_consumption = excluded.electricity_consumption,
    fuel_consumption = excluded.fuel_consumption,
    fuel_type = excluded.fuel_type,
    renewable_energy_usage = excluded.renewable_energy_usage,
    emissions_scope_1 = excluded.emissions_scope_1,
    emissions_scope_2 = excluded.emissions_scope_2,
    carbon_intensity = excluded.carbon_intensity,
    esg_readiness_status = excluded.esg_readiness_status;

  insert into energy_records (
    id, organisation_id, facility_id, date, reporting_period, energy_type, quantity, unit,
    source_document, notes, emissions, audit_trail, activity_type, source_type, scope,
    emission_factor_id, emission_factor_value, emission_factor_unit,
    emissions_kg_co2e, emissions_t_co2e, calculation_metadata
  ) values
    (
      'rec-demo-pune-grid-apr', org_id, 'fac-demo-pune-press-shop', '2026-04-30', 'FY 2025-26',
      'Grid Electricity', 82000, 'kWh', 'MSEDCL Bill Apr 2026',
      'Main press shop grid electricity.', 58.712,
      '{"methodology":"activity_data_x_emission_factor","factorSource":"Prototype factor - replace before audit use"}'::jsonb,
      'electricity', 'Grid Electricity', 'scope-2',
      'ef-grid-electricity-india-2025-prototype', 0.716, 'kgCO2e/kWh',
      58712, 58.712,
      '{"methodology":"activity_data_x_emission_factor","sourceType":"Grid Electricity"}'::jsonb
    ),
    (
      'rec-demo-pune-grid-may', org_id, 'fac-demo-pune-press-shop', '2026-05-31', 'FY 2025-26',
      'Grid Electricity', 106000, 'kWh', 'MSEDCL Bill May 2026',
      'Higher summer compressor and HVAC load.', 75.896,
      '{"methodology":"activity_data_x_emission_factor","factorSource":"Prototype factor - replace before audit use"}'::jsonb,
      'electricity', 'Grid Electricity', 'scope-2',
      'ef-grid-electricity-india-2025-prototype', 0.716, 'kgCO2e/kWh',
      75896, 75.896,
      '{"methodology":"activity_data_x_emission_factor","sourceType":"Grid Electricity"}'::jsonb
    ),
    (
      'rec-demo-pune-diesel-may', org_id, 'fac-demo-pune-press-shop', '2026-05-20', 'FY 2025-26',
      'Diesel', 6200, 'litre', 'Diesel Invoice May 2026',
      'DG backup and forklifts.', 16.616,
      '{"methodology":"activity_data_x_emission_factor","factorSource":"Prototype factor - replace before audit use"}'::jsonb,
      'fuel', 'Diesel', 'scope-1',
      'ef-diesel-india-2025-prototype', 2.68, 'kgCO2e/litre',
      16616, 16.616,
      '{"methodology":"activity_data_x_emission_factor","sourceType":"Diesel"}'::jsonb
    ),
    (
      'rec-demo-pune-solar-may', org_id, 'fac-demo-pune-press-shop', '2026-05-31', 'FY 2025-26',
      'On-site Solar', 21000, 'kWh', 'Solar Inverter Export May 2026',
      'Rooftop solar generation used on-site.', 0,
      '{"methodology":"activity_data_x_emission_factor","factorSource":"Prototype factor - replace before audit use"}'::jsonb,
      'renewable-electricity', 'On-site Solar', 'scope-2',
      'ef-onsite-solar-india-2025-prototype', 0, 'kgCO2e/kWh',
      0, 0,
      '{"methodology":"activity_data_x_emission_factor","sourceType":"On-site Solar"}'::jsonb
    ),
    (
      'rec-demo-chakan-grid-may', org_id, 'fac-demo-chakan-machining', '2026-05-31', 'FY 2025-26',
      'Grid Electricity', 93000, 'kWh', 'MSEDCL Bill May 2026',
      'CNC machining electricity consumption.', 66.588,
      '{"methodology":"activity_data_x_emission_factor","factorSource":"Prototype factor - replace before audit use"}'::jsonb,
      'electricity', 'Grid Electricity', 'scope-2',
      'ef-grid-electricity-india-2025-prototype', 0.716, 'kgCO2e/kWh',
      66588, 66.588,
      '{"methodology":"activity_data_x_emission_factor","sourceType":"Grid Electricity"}'::jsonb
    ),
    (
      'rec-demo-chakan-gas-may', org_id, 'fac-demo-chakan-machining', '2026-05-25', 'FY 2025-26',
      'Natural Gas', 5400, 'SCM', 'MGL Gas Bill May 2026',
      'Heat treatment furnace gas.', 10.908,
      '{"methodology":"activity_data_x_emission_factor","factorSource":"Prototype factor - replace before audit use"}'::jsonb,
      'fuel', 'Natural Gas', 'scope-1',
      'ef-natural-gas-india-2025-prototype', 2.02, 'kgCO2e/SCM',
      10908, 10.908,
      '{"methodology":"activity_data_x_emission_factor","sourceType":"Natural Gas"}'::jsonb
    ),
    (
      'rec-demo-sanand-grid-may', org_id, 'fac-demo-sanand-assembly', '2026-05-31', 'FY 2025-26',
      'Grid Electricity', 68000, 'kWh', 'Torrent Power Bill May 2026',
      'Assembly line grid electricity.', 48.688,
      '{"methodology":"activity_data_x_emission_factor","factorSource":"Prototype factor - replace before audit use"}'::jsonb,
      'electricity', 'Grid Electricity', 'scope-2',
      'ef-grid-electricity-india-2025-prototype', 0.716, 'kgCO2e/kWh',
      48688, 48.688,
      '{"methodology":"activity_data_x_emission_factor","sourceType":"Grid Electricity"}'::jsonb
    ),
    (
      'rec-demo-sanand-lpg-may', org_id, 'fac-demo-sanand-assembly', '2026-05-18', 'FY 2025-26',
      'LPG', 2700, 'litre', 'LPG Invoice May 2026',
      'Paint booth curing and canteen load.', 4.077,
      '{"methodology":"activity_data_x_emission_factor","factorSource":"Prototype factor - replace before audit use"}'::jsonb,
      'fuel', 'LPG', 'scope-1',
      'ef-lpg-india-2025-prototype', 1.51, 'kgCO2e/litre',
      4077, 4.077,
      '{"methodology":"activity_data_x_emission_factor","sourceType":"LPG"}'::jsonb
    )
  on conflict (id) do update set
    quantity = excluded.quantity,
    emissions = excluded.emissions,
    emissions_kg_co2e = excluded.emissions_kg_co2e,
    emissions_t_co2e = excluded.emissions_t_co2e,
    notes = excluded.notes,
    calculation_metadata = excluded.calculation_metadata;

  insert into production_records (
    id, organisation_id, facility_id, date, reporting_period, quantity, unit, source_document, notes
  ) values
    ('prod-demo-pune-apr', org_id, 'fac-demo-pune-press-shop', '2026-04-30', 'FY 2025-26', 1520, 'Tonnes', 'Production MIS Apr 2026', 'Pressed and stamped components.'),
    ('prod-demo-pune-may', org_id, 'fac-demo-pune-press-shop', '2026-05-31', 'FY 2025-26', 1680, 'Tonnes', 'Production MIS May 2026', 'Higher export dispatch month.'),
    ('prod-demo-chakan-may', org_id, 'fac-demo-chakan-machining', '2026-05-31', 'FY 2025-26', 1125, 'Tonnes', 'Production MIS May 2026', 'Machined shafts and housings.'),
    ('prod-demo-sanand-may', org_id, 'fac-demo-sanand-assembly', '2026-05-31', 'FY 2025-26', 920, 'Tonnes', 'Production MIS May 2026', 'Tier-2 assembly units.')
  on conflict (id) do update set
    quantity = excluded.quantity,
    source_document = excluded.source_document,
    notes = excluded.notes;

  insert into esg_questions (
    id, organisation_id, category, question, answer, evidence, score, status,
    recommendation, assigned_user, review_status
  ) values
    (
      'esg-demo-1', org_id, 'Environmental',
      'Does the company track Scope 1 and Scope 2 emissions monthly?',
      'Yes. Electricity, diesel, natural gas, LPG, and on-site solar are tracked by facility.',
      'Energy ledger, invoices, meter readings', 86, 'Compliant',
      'Add quarterly management sign-off for stronger audit traceability.', 'Operations Head', 'Approved'
    ),
    (
      'esg-demo-2', org_id, 'Energy',
      'Is there a formal energy efficiency plan for high-load equipment?',
      'Partially. Compressor leak survey and CNC idle-load reduction are planned.',
      'Energy audit action register', 62, 'Partial',
      'Convert identified opportunities into assigned projects with milestones.', 'Maintenance Manager', 'In Review'
    ),
    (
      'esg-demo-3', org_id, 'Compliance',
      'Are statutory environmental permits and consents current?',
      'Most key consents are available; one renewal tracker needs evidence upload.',
      'CTO renewal tracker', 58, 'Partial',
      'Upload latest consent documents and link them to facilities.', 'EHS Manager', 'Missing Evidence'
    ),
    (
      'esg-demo-4', org_id, 'Supplier Readiness',
      'Can the company answer buyer carbon questionnaires with evidence?',
      'Draft answers are prepared for OEM supplier questionnaires.',
      'OEM questionnaire draft', 72, 'Partial',
      'Attach invoice-backed emission summaries before submission.', 'Sustainability Lead', 'In Review'
    )
  on conflict (id) do update set
    answer = excluded.answer,
    evidence = excluded.evidence,
    score = excluded.score,
    status = excluded.status,
    recommendation = excluded.recommendation,
    assigned_user = excluded.assigned_user,
    review_status = excluded.review_status;

  insert into documents (
    id, organisation_id, name, category, upload_date, facility_id, period, size, ai_status, evidence_usage
  ) values
    ('doc-demo-1', org_id, 'MSEDCL Electricity Bill - Pune - May 2026.pdf', 'Electricity Bill', '2026-06-03', 'fac-demo-pune-press-shop', 'May 2026', '1.8 MB', 'Processed', 'Supports Scope 2 electricity record.'),
    ('doc-demo-2', org_id, 'Diesel Vendor Invoice - Pune - May 2026.pdf', 'Fuel Invoice', '2026-06-04', 'fac-demo-pune-press-shop', 'May 2026', '940 KB', 'Processed', 'Supports Scope 1 diesel record.'),
    ('doc-demo-3', org_id, 'Production MIS Summary - May 2026.xlsx', 'Production Record', '2026-06-05', 'fac-demo-pune-press-shop', 'May 2026', '420 KB', 'Processed', 'Supports intensity calculation.'),
    ('doc-demo-4', org_id, 'ISO 14001 Certificate.pdf', 'Environmental Certification', '2026-04-12', null, 'FY 2025-26', '760 KB', 'Processed', 'Supports ESG environmental management evidence.'),
    ('doc-demo-5', org_id, 'Compressed Air Leak Survey Draft.pdf', 'Energy Audit', '2026-06-08', 'fac-demo-chakan-machining', 'FY 2025-26', '1.1 MB', 'Processed', 'Supports reduction opportunity investigation.')
  on conflict (id) do update set
    name = excluded.name,
    category = excluded.category,
    upload_date = excluded.upload_date,
    facility_id = excluded.facility_id,
    period = excluded.period,
    size = excluded.size,
    ai_status = excluded.ai_status,
    evidence_usage = excluded.evidence_usage;

  insert into oem_questionnaires (
    id, organisation_id, title, oem_name, due_date, status, questions
  ) values (
    'oem-demo-1',
    org_id,
    'FY 2025-26 Supplier Sustainability Disclosure',
    'Tata Motors Supplier Portal',
    '2026-08-15',
    'In Progress',
    '[
      {
        "id": "oemq-demo-1",
        "question": "Do you track facility-level Scope 1 and Scope 2 emissions?",
        "category": "Carbon Accounting",
        "suggestedAnswer": "Yes. Apex Precision Components tracks facility-level Scope 1 and Scope 2 activity data using invoice-backed records for electricity, diesel, natural gas, LPG, and on-site solar.",
        "evidenceSource": "Energy ledger and utility invoices",
        "confidence": "High",
        "status": "Ready for Review"
      },
      {
        "id": "oemq-demo-2",
        "question": "Do you have an active energy reduction plan?",
        "category": "Energy Management",
        "suggestedAnswer": "Yes. Current actions include compressed air leak reduction, solar substitution, and machine idle-load reduction projects.",
        "evidenceSource": "Energy audit action register",
        "confidence": "Medium",
        "status": "Draft"
      }
    ]'::jsonb
  )
  on conflict (id) do update set
    title = excluded.title,
    oem_name = excluded.oem_name,
    due_date = excluded.due_date,
    status = excluded.status,
    questions = excluded.questions;

  insert into reports (
    id, organisation_id, title, type, period, created_date, summary, status, download_url
  ) values
    (
      'rep-demo-1', org_id, 'May 2026 Carbon Footprint Snapshot',
      'Carbon Footprint', 'May 2026', '2026-06-10',
      'Demo report summarising Scope 1, Scope 2, renewable share, and facility hotspots.',
      'Generated', '#'
    ),
    (
      'rep-demo-2', org_id, 'FY 2025-26 ESG Readiness Pack',
      'ESG Readiness', 'FY 2025-26', '2026-06-12',
      'Demo ESG pack for supplier due diligence and customer questionnaires.',
      'Draft', '#'
    )
  on conflict (id) do update set
    title = excluded.title,
    type = excluded.type,
    period = excluded.period,
    created_date = excluded.created_date,
    summary = excluded.summary,
    status = excluded.status;

  insert into diagnostic_question_responses (
    id, organisation_id, facility_id, question_id, industry, category, question_text,
    answer_type, answer, evidence_reference
  ) values
    ('diag-demo-1', org_id, 'fac-demo-pune-press-shop', 'compressed-air-used', 'Automobile Components', 'Energy Systems', 'Is compressed air used in production?', 'yes-no', 'yes', 'Compressed Air Leak Survey Draft.pdf'),
    ('diag-demo-2', org_id, 'fac-demo-pune-press-shop', 'compressed-air-leak-survey', 'Automobile Components', 'Energy Systems', 'Was a compressed air leak survey completed in the last 12 months?', 'yes-no', 'no', ''),
    ('diag-demo-3', org_id, 'fac-demo-pune-press-shop', 'heat-treatment-used', 'Automobile Components', 'Thermal Process', 'Is heat treatment or thermal processing used?', 'yes-no', 'yes', 'Natural gas and diesel records'),
    ('diag-demo-4', org_id, 'fac-demo-pune-press-shop', 'renewable-electricity-share', 'Automobile Components', 'Renewable Energy', 'What percentage of electricity is from on-site renewable sources?', 'number', '18', 'Solar inverter export report')
  on conflict (organisation_id, coalesce(facility_id, ''), question_id) do update set
    answer = excluded.answer,
    evidence_reference = excluded.evidence_reference,
    updated_at = now();

  insert into reduction_opportunities (
    id, organisation_id, facility_id, title, category, source, description, rationale,
    status, confidence, engineering_assessment_required, estimated_annual_reduction_t_co2e,
    estimated_annual_energy_savings, energy_savings_unit, estimated_capex,
    estimated_annual_cost_savings, simple_payback_years, calculation_metadata
  ) values
    (
      'opp-demo-1', org_id, 'fac-demo-pune-press-shop',
      'Compressed air leak reduction programme', 'Energy Efficiency', 'diagnostic',
      'Survey and repair leakage points across press shop compressed air headers.',
      'Compressed air is used and the latest leak survey is missing.',
      'identified', 'medium', true, 22.5, 31500, 'kWh', 280000, 410000, 0.68,
      '{"basis":"Demo estimate for workflow testing only"}'::jsonb
    ),
    (
      'opp-demo-2', org_id, 'fac-demo-sanand-assembly',
      'Increase on-site solar consumption', 'Renewable Electricity', 'hotspot',
      'Shift selected daytime loads to maximize behind-the-meter solar use.',
      'Grid electricity remains a major Scope 2 source.',
      'under-review', 'medium', true, 18.9, 26400, 'kWh', 150000, 260000, 0.58,
      '{"basis":"Demo estimate for workflow testing only"}'::jsonb
    )
  on conflict (id) do update set
    status = excluded.status,
    estimated_annual_reduction_t_co2e = excluded.estimated_annual_reduction_t_co2e,
    calculation_metadata = excluded.calculation_metadata;

  insert into reduction_scenarios (
    id, organisation_id, facility_id, title, baseline_start_date, baseline_end_date,
    scenario_type, assumptions, baseline_emissions_t_co2e, scenario_emissions_t_co2e,
    estimated_reduction_t_co2e, estimated_reduction_percent, calculation_metadata
  ) values (
    'scn-demo-1', org_id, 'fac-demo-pune-press-shop',
    'Reduce grid electricity by 12% through compressor optimization',
    '2026-04-01', '2026-05-31', 'grid-electricity-reduction',
    '{"reductionPercent":12,"measure":"Compressed air optimization"}'::jsonb,
    134.608, 118.455, 16.153, 12,
    '{"basis":"Demo scenario for UI testing"}'::jsonb
  )
  on conflict (id) do update set
    assumptions = excluded.assumptions,
    scenario_emissions_t_co2e = excluded.scenario_emissions_t_co2e,
    estimated_reduction_t_co2e = excluded.estimated_reduction_t_co2e,
    estimated_reduction_percent = excluded.estimated_reduction_percent;

  insert into decarbonization_projects (
    id, organisation_id, facility_id, opportunity_id, scenario_id, title, description,
    category, status, owner, baseline_start_date, baseline_end_date,
    planned_start_date, planned_completion_date, target_annual_reduction_t_co2e,
    estimated_capex, estimated_annual_cost_savings
  ) values (
    'proj-demo-1', org_id, 'fac-demo-pune-press-shop', 'opp-demo-1', 'scn-demo-1',
    'Press shop compressed air optimization',
    'Leak survey, repair, pressure band tuning, and operator shutdown SOP rollout.',
    'Energy Efficiency', 'in-progress', 'Maintenance Manager',
    '2026-04-01', '2026-05-31', '2026-07-01', '2026-09-30',
    22.5, 280000, 410000
  )
  on conflict (id) do update set
    status = excluded.status,
    owner = excluded.owner,
    target_annual_reduction_t_co2e = excluded.target_annual_reduction_t_co2e;

  insert into project_milestones (
    id, project_id, title, description, due_date, completed_at, status
  ) values
    ('mile-demo-1', 'proj-demo-1', 'Complete leak survey', 'Tag and quantify leakage points by zone.', '2026-07-20', null, 'in-progress'),
    ('mile-demo-2', 'proj-demo-1', 'Repair priority leaks', 'Close high-volume leaks and verify pressure recovery.', '2026-08-15', null, 'pending'),
    ('mile-demo-3', 'proj-demo-1', 'Publish shutdown SOP', 'Operator checklist for non-production hours.', '2026-09-10', null, 'pending')
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    due_date = excluded.due_date,
    status = excluded.status;

  insert into project_measurements (
    id, project_id, measurement_start_date, measurement_end_date, expected_reduction_percent,
    baseline_intensity, observed_intensity, observed_improvement_percent,
    variance_percentage_points, methodology, calculation_metadata
  ) values (
    'meas-demo-1', 'proj-demo-1', '2026-05-01', '2026-05-31', 12,
    0.0801, 0.0748, 6.62, -5.38,
    'Observed performance change only; does not prove project causality.',
    '{"basis":"Demo baseline and observed intensity for UI testing"}'::jsonb
  )
  on conflict (id) do update set
    expected_reduction_percent = excluded.expected_reduction_percent,
    baseline_intensity = excluded.baseline_intensity,
    observed_intensity = excluded.observed_intensity,
    observed_improvement_percent = excluded.observed_improvement_percent,
    variance_percentage_points = excluded.variance_percentage_points;
end $$;
