-- Balancing Carbon comprehensive demo data.
-- Prerequisites: migrations 000-021 and an existing registered Supabase Auth user.
-- Set target_email below, then run the entire script in Supabase SQL Editor.
-- Safe to rerun: deterministic demo IDs are updated instead of duplicated.

do $$
declare
  target_email text := 'singhyuvr.aj1211@gmail.com';
  target_user_id uuid;
  org_id text;
  suffix text;
  fac_1 text;
  fac_2 text;
  energy_source_id text;
begin
  select id into target_user_id from auth.users where lower(email) = lower(target_email) limit 1;
  if target_user_id is null then
    raise exception 'No registered Supabase Auth user found for %. Register first and update target_email.', target_email;
  end if;

  select organisation_id into org_id from profiles where id = target_user_id limit 1;
  if org_id is null then
    raise exception 'User % has no profile/organisation. Complete registration before seeding.', target_email;
  end if;

  suffix := left(replace(target_user_id::text, '-', ''), 12);
  fac_1 := 'demo-fac-pune-' || suffix;
  fac_2 := 'demo-fac-ahmedabad-' || suffix;
  select id into energy_source_id from data_source_definitions where source_key = 'energy-activity' limit 1;

  update organisations set
    name = 'Apex Precision Components Pvt. Ltd.', industry = 'Automobile Components',
    location = 'Pune, Maharashtra', employee_count = 420,
    reporting_year = 'FY 2026-27', target_reduction_percent = 28
  where id = org_id;

  insert into facilities (
    id, organisation_id, name, location, industry_type, production_output, production_unit,
    reporting_period, electricity_consumption, fuel_consumption, fuel_type,
    renewable_energy_usage, emissions_scope_1, emissions_scope_2, carbon_intensity,
    esg_readiness_status
  ) values
    (fac_1, org_id, 'Pune Precision Plant', 'Pune, Maharashtra', 'Automobile Components',
     7850, 'tonne', 'FY 2026-27', 505000, 9200, 'Diesel', 64000, 24.656, 315.294, 43.31, 'Good'),
    (fac_2, org_id, 'Ahmedabad Die Casting Plant', 'Ahmedabad, Gujarat', 'Aluminium Die Casting',
     6120, 'tonne', 'FY 2026-27', 408000, 6400, 'Diesel', 82000, 17.152, 233.416, 40.94, 'Needs Improvement')
  on conflict (id) do update set
    name=excluded.name, location=excluded.location, industry_type=excluded.industry_type,
    production_output=excluded.production_output, production_unit=excluded.production_unit,
    reporting_period=excluded.reporting_period, electricity_consumption=excluded.electricity_consumption,
    fuel_consumption=excluded.fuel_consumption, fuel_type=excluded.fuel_type,
    renewable_energy_usage=excluded.renewable_energy_usage, emissions_scope_1=excluded.emissions_scope_1,
    emissions_scope_2=excluded.emissions_scope_2, carbon_intensity=excluded.carbon_intensity,
    esg_readiness_status=excluded.esg_readiness_status;

  insert into energy_records (
    id, organisation_id, facility_id, date, reporting_period, energy_type, quantity, unit,
    source_document, notes, emissions, audit_trail, activity_type, source_type, scope,
    emission_factor_id, registry_emission_factor_id, emission_factor_value, emission_factor_unit,
    emissions_kg_co2e, emissions_t_co2e, calculation_metadata,
    input_quantity, input_unit, canonical_quantity, canonical_unit, conversion_factor, conversion_path
  ) values
    ('demo-energy-01-'||suffix,org_id,fac_1,'2026-01-31','FY 2026-27','Grid Electricity',76000,'kWh','Pune electricity bill Jan','Demo invoice-backed activity',54.416,'{"demo":true}'::jsonb,'electricity','Grid Electricity','scope-2',null,'efr-india-grid-2025-v1',0.716,'kgCO2e/kWh',54416,54.416,'{"demo":true,"methodology":"activity_data_x_emission_factor","emissionFactorId":"efr-india-grid-2025-v1"}'::jsonb,76000,'kWh',76000,'kWh',1,'[]'::jsonb),
    ('demo-energy-02-'||suffix,org_id,fac_1,'2026-02-28','FY 2026-27','Grid Electricity',81000,'kWh','Pune electricity bill Feb','Demo monthly trend',57.996,'{"demo":true}'::jsonb,'electricity','Grid Electricity','scope-2',null,'efr-india-grid-2025-v1',0.716,'kgCO2e/kWh',57996,57.996,'{"demo":true,"methodology":"activity_data_x_emission_factor","emissionFactorId":"efr-india-grid-2025-v1"}'::jsonb,81000,'kWh',81000,'kWh',1,'[]'::jsonb),
    ('demo-energy-03-'||suffix,org_id,fac_1,'2026-03-31','FY 2026-27','Grid Electricity',79000,'kWh','Pune electricity bill Mar','Demo monthly trend',56.564,'{"demo":true}'::jsonb,'electricity','Grid Electricity','scope-2',null,'efr-india-grid-2025-v1',0.716,'kgCO2e/kWh',56564,56.564,'{"demo":true,"methodology":"activity_data_x_emission_factor","emissionFactorId":"efr-india-grid-2025-v1"}'::jsonb,79000,'kWh',79000,'kWh',1,'[]'::jsonb),
    ('demo-energy-04-'||suffix,org_id,fac_2,'2026-01-31','FY 2026-27','Grid Electricity',68000,'kWh','Ahmedabad electricity bill Jan','Demo second facility',48.688,'{"demo":true}'::jsonb,'electricity','Grid Electricity','scope-2',null,'efr-india-grid-2025-v1',0.716,'kgCO2e/kWh',48688,48.688,'{"demo":true,"methodology":"activity_data_x_emission_factor","emissionFactorId":"efr-india-grid-2025-v1"}'::jsonb,68000,'kWh',68000,'kWh',1,'[]'::jsonb),
    ('demo-energy-05-'||suffix,org_id,fac_2,'2026-02-28','FY 2026-27','Grid Electricity',71000,'kWh','Ahmedabad electricity bill Feb','Demo second facility',50.836,'{"demo":true}'::jsonb,'electricity','Grid Electricity','scope-2',null,'efr-india-grid-2025-v1',0.716,'kgCO2e/kWh',50836,50.836,'{"demo":true,"methodology":"activity_data_x_emission_factor","emissionFactorId":"efr-india-grid-2025-v1"}'::jsonb,71000,'kWh',71000,'kWh',1,'[]'::jsonb),
    ('demo-energy-06-'||suffix,org_id,fac_2,'2026-03-31','FY 2026-27','On-site Solar',22000,'kWh','Solar inverter export Mar','Renewable operational generation',0,'{"demo":true}'::jsonb,'renewable-electricity','On-site Solar','scope-2',null,'efr-india-solar-2025-v1',0,'kgCO2e/kWh',0,0,'{"demo":true,"methodology":"activity_data_x_emission_factor","emissionFactorId":"efr-india-solar-2025-v1"}'::jsonb,22000,'kWh',22000,'kWh',1,'[]'::jsonb)
  on conflict (id) do update set quantity=excluded.quantity, emissions=excluded.emissions,
    emissions_kg_co2e=excluded.emissions_kg_co2e, emissions_t_co2e=excluded.emissions_t_co2e,
    registry_emission_factor_id=excluded.registry_emission_factor_id, calculation_metadata=excluded.calculation_metadata;

  insert into production_records (id,organisation_id,facility_id,date,reporting_period,quantity,unit,source_document,notes,input_quantity,input_unit,canonical_quantity,canonical_unit,conversion_factor,conversion_path) values
    ('demo-prod-01-'||suffix,org_id,fac_1,'2026-01-31','FY 2026-27',630,'tonne','January production MIS','Pressed components',630,'tonne',630,'tonne',1,'[]'::jsonb),
    ('demo-prod-02-'||suffix,org_id,fac_1,'2026-02-28','FY 2026-27',655,'tonne','February production MIS','Pressed components',655,'tonne',655,'tonne',1,'[]'::jsonb),
    ('demo-prod-03-'||suffix,org_id,fac_1,'2026-03-31','FY 2026-27',680,'tonne','March production MIS','Pressed components',680,'tonne',680,'tonne',1,'[]'::jsonb),
    ('demo-prod-04-'||suffix,org_id,fac_2,'2026-01-31','FY 2026-27',480,'tonne','January production MIS','Cast components',480,'tonne',480,'tonne',1,'[]'::jsonb),
    ('demo-prod-05-'||suffix,org_id,fac_2,'2026-02-28','FY 2026-27',505,'tonne','February production MIS','Cast components',505,'tonne',505,'tonne',1,'[]'::jsonb)
  on conflict (id) do update set quantity=excluded.quantity, source_document=excluded.source_document;

  insert into water_records (id,organisation_id,facility_id,date,reporting_period,flow_type,source,destination,quantity,unit,input_quantity,input_unit,canonical_quantity,canonical_unit,conversion_factor,conversion_path,quality_parameter,source_document,notes,created_by) values
    ('demo-water-01-'||suffix,org_id,fac_1,'2026-03-31','FY 2026-27','withdrawal','Municipal supply','Process and domestic',1850,'water-kL',1850,'water-kL',1850,'water-kL',1,'[]'::jsonb,'TDS within internal limit','Water bill Mar','Demo water ledger',target_user_id)
  on conflict (id) do update set quantity=excluded.quantity, notes=excluded.notes;

  insert into waste_records (id,organisation_id,facility_id,date,reporting_period,waste_type,disposal_method,recovery_method,vendor,quantity,unit,input_quantity,input_unit,canonical_quantity,canonical_unit,conversion_factor,conversion_path,source_document,notes,created_by) values
    ('demo-waste-01-'||suffix,org_id,fac_1,'2026-03-31','FY 2026-27','Steel scrap','Authorized recycler','Recycling','Demo Metals Recycler',42,'tonne',42,'tonne',42,'tonne',1,'[]'::jsonb,'Recycler weighbridge slip','Recoverable production scrap',target_user_id)
  on conflict (id) do update set quantity=excluded.quantity, notes=excluded.notes;

  insert into material_records (id,organisation_id,facility_id,date,reporting_period,material,supplier,batch,origin,recycled_content,quantity,unit,input_quantity,input_unit,canonical_quantity,canonical_unit,conversion_factor,conversion_path,source_document,notes,created_by) values
    ('demo-material-01-'||suffix,org_id,fac_1,'2026-03-15','FY 2026-27','Cold rolled steel coil','Demo Steel Supplier','CR-260315','India',22,760,'tonne',760,'tonne',760,'tonne',1,'[]'::jsonb,'Purchase invoice Mar','Primary production material',target_user_id)
  on conflict (id) do update set quantity=excluded.quantity, recycled_content=excluded.recycled_content;

  insert into air_emission_records (id,organisation_id,facility_id,date,reporting_period,parameter,value,unit,stack_id,method,regulatory_limit,source_document,notes,created_by) values
    ('demo-air-01-'||suffix,org_id,fac_2,'2026-03-20','FY 2026-27','Particulate Matter',38,'mg/Nm3','Stack-DC-01','Third-party stack monitoring',50,'Stack report Mar','Within consent limit',target_user_id)
  on conflict (id) do update set value=excluded.value, regulatory_limit=excluded.regulatory_limit;

  insert into esg_questions (id,organisation_id,category,question,answer,evidence,score,status,recommendation,assigned_user,review_status) values
    ('demo-esg-01-'||suffix,org_id,'Environmental','Are Scope 1 and Scope 2 emissions tracked monthly?','Yes, by facility and source.','Energy bills and ledger',88,'Compliant','Add quarterly reviewer sign-off.','Sustainability Manager','Approved'),
    ('demo-esg-02-'||suffix,org_id,'Energy','Is an energy-reduction programme active?','Compressor and solar projects are active.','Project register',68,'Partial','Record measured savings each month.','Plant Manager','In Review'),
    ('demo-esg-03-'||suffix,org_id,'Compliance','Are all environmental permits current?','One renewal is awaiting evidence.','Consent tracker',55,'Partial','Upload the renewed consent.','EHS Manager','Missing Evidence')
  on conflict (id) do update set answer=excluded.answer,evidence=excluded.evidence,score=excluded.score,status=excluded.status,recommendation=excluded.recommendation,assigned_user=excluded.assigned_user,review_status=excluded.review_status;

  insert into oem_questionnaires (id,organisation_id,title,oem_name,due_date,status,questions) values
    ('demo-oem-01-'||suffix,org_id,'FY 2026-27 Supplier Carbon Disclosure','Demo Automotive OEM','2026-09-30','In Progress','[{"question":"Provide Scope 1 and 2 totals","answer":"Drafted from operational ledger"},{"question":"List reduction projects","answer":"Solar and compressor optimisation"}]'::jsonb)
  on conflict (id) do update set due_date=excluded.due_date,status=excluded.status,questions=excluded.questions;

  insert into documents (id,organisation_id,name,category,upload_date,facility_id,period,size,ai_status,evidence_usage) values
    ('demo-doc-01-'||suffix,org_id,'Pune electricity bill - March 2026.pdf','Electricity Bill','2026-04-03',fac_1,'March 2026','1.4 MB','Processed','Supports Scope 2 activity'),
    ('demo-doc-02-'||suffix,org_id,'Stack monitoring report - March 2026.pdf','Environmental Evidence','2026-04-05',fac_2,'March 2026','2.1 MB','Processed','Supports air-emission compliance')
  on conflict (id) do update set name=excluded.name,evidence_usage=excluded.evidence_usage;

  insert into reports (id,organisation_id,title,type,period,created_date,summary,status,download_url,workflow_status,tags) values
    ('demo-report-01-'||suffix,org_id,'Q1 Carbon Inventory','GHG Inventory','Jan-Mar 2026','2026-04-10','Facility-level Scope 1 and Scope 2 demo report.','Generated','#','under-review','["demo","quarterly"]'::jsonb),
    ('demo-report-02-'||suffix,org_id,'Supplier ESG Readiness','ESG Summary','FY 2026-27','2026-04-11','Demo management summary with evidence gaps.','Draft','#','draft','["demo","esg"]'::jsonb)
  on conflict (id) do update set summary=excluded.summary,workflow_status=excluded.workflow_status,tags=excluded.tags;

  insert into reduction_opportunities (id,organisation_id,facility_id,title,category,source,description,rationale,status,confidence,engineering_assessment_required,estimated_annual_reduction_t_co2e,estimated_annual_energy_savings,energy_savings_unit,estimated_capex,estimated_annual_cost_savings,simple_payback_years,calculation_metadata) values
    ('demo-opp-01-'||suffix,org_id,fac_1,'Compressed-air leak reduction','Energy efficiency','manual','Repair leaks and reduce unloaded compressor hours.','Electricity is the largest recorded source.','approved','medium',true,18.5,25800,'kWh',480000,310000,1.55,'{"demo":true,"assumption":"engineering validation required"}'::jsonb)
  on conflict (id) do update set status=excluded.status,estimated_annual_reduction_t_co2e=excluded.estimated_annual_reduction_t_co2e;

  insert into reduction_scenarios (id,organisation_id,facility_id,title,baseline_start_date,baseline_end_date,scenario_type,assumptions,baseline_emissions_t_co2e,scenario_emissions_t_co2e,estimated_reduction_t_co2e,estimated_reduction_percent,calculation_metadata) values
    ('demo-scenario-01-'||suffix,org_id,fac_1,'10% grid electricity reduction','2026-01-01','2026-03-31','grid-electricity-reduction','{"reductionPercent":10}'::jsonb,168.976,152.078,16.898,10,'{"demo":true,"baselineImmutable":true}'::jsonb)
  on conflict (id) do update set scenario_emissions_t_co2e=excluded.scenario_emissions_t_co2e,estimated_reduction_t_co2e=excluded.estimated_reduction_t_co2e;

  insert into decarbonization_projects (id,organisation_id,facility_id,opportunity_id,scenario_id,title,description,category,status,owner,planned_start_date,planned_completion_date,target_annual_reduction_t_co2e,estimated_capex,estimated_annual_cost_savings) values
    ('demo-project-01-'||suffix,org_id,fac_1,'demo-opp-01-'||suffix,'demo-scenario-01-'||suffix,'Compressed-air optimisation','Leak survey, repairs, controls tuning, and measurement.','Energy efficiency','in-progress','Plant Energy Manager','2026-04-01','2026-08-31',18.5,480000,310000)
  on conflict (id) do update set status=excluded.status,owner=excluded.owner,target_annual_reduction_t_co2e=excluded.target_annual_reduction_t_co2e;

  if energy_source_id is not null then
    insert into data_import_jobs (id,organisation_id,source_definition_id,filename,format,status,row_count,valid_count,invalid_count,duplicate_count,confidence_score,source_headers,mapping_snapshot,created_by,completed_at) values
      ('demo-job-01-'||suffix,org_id,energy_source_id,'demo-energy-import.csv','csv','completed',4,4,0,0,100,'["Facility","Date","Source Type","Quantity","Unit"]'::jsonb,'{"Facility":"facility_id","Date":"date","Source Type":"source_type","Quantity":"quantity","Unit":"unit"}'::jsonb,target_user_id,now())
    on conflict (id) do update set status=excluded.status,row_count=excluded.row_count,valid_count=excluded.valid_count;

    insert into ingested_records (id,organisation_id,source_definition_id,import_job_id,target_entity_key,record_data,canonical_data,duplicate_signature,quality_score,status,created_by) values
      ('demo-stage-01-'||suffix,org_id,energy_source_id,'demo-job-01-'||suffix,'activity',jsonb_build_object('facility_id',fac_1,'date','2026-04-30','source_type','Grid Electricity','quantity',84000,'unit','kWh','source_document','April bill awaiting review'),jsonb_build_object('facility_id',fac_1,'date','2026-04-30','source_type','Grid Electricity','quantity',84000,'unit','kWh'),'demo-stage-staged-'||suffix,100,'staged',target_user_id),
      ('demo-stage-02-'||suffix,org_id,energy_source_id,'demo-job-01-'||suffix,'activity',jsonb_build_object('facility_id',fac_2,'date','2026-04-30','source_type','Grid Electricity','quantity',73500,'unit','kWh','source_document','April bill approved'),jsonb_build_object('facility_id',fac_2,'date','2026-04-30','source_type','Grid Electricity','quantity',73500,'unit','kWh'),'demo-stage-approved-'||suffix,100,'approved',target_user_id),
      ('demo-stage-03-'||suffix,org_id,energy_source_id,'demo-job-01-'||suffix,'activity',jsonb_build_object('facility_id',fac_1,'date','2026-04-30','source_type','Grid Electricity','quantity',-1,'unit','kWh'),jsonb_build_object('facility_id',fac_1),'demo-stage-rejected-'||suffix,25,'rejected',target_user_id)
    on conflict (id) do update set record_data=excluded.record_data,canonical_data=excluded.canonical_data,quality_score=excluded.quality_score,status=excluded.status;
  end if;

  insert into audit_logs (id,organisation_id,user_id,user_email,action,details,timestamp) values
    ('demo-audit-01-'||suffix,org_id,target_user_id,target_email,'demo.seeded','Comprehensive demo dataset inserted or refreshed.',now())
  on conflict (id) do update set details=excluded.details,timestamp=excluded.timestamp;

  raise notice 'Demo data loaded for organisation % using facilities % and %.', org_id, fac_1, fac_2;
end $$;

-- Quick verification summary.
select 'facilities' as dataset, count(*) as demo_rows from facilities where id like 'demo-fac-%'
union all select 'energy_records', count(*) from energy_records where id like 'demo-energy-%'
union all select 'production_records', count(*) from production_records where id like 'demo-prod-%'
union all select 'environmental_ledgers',
  (select count(*) from water_records where id like 'demo-water-%') +
  (select count(*) from waste_records where id like 'demo-waste-%') +
  (select count(*) from material_records where id like 'demo-material-%') +
  (select count(*) from air_emission_records where id like 'demo-air-%')
union all select 'staging_records', count(*) from ingested_records where id like 'demo-stage-%';
