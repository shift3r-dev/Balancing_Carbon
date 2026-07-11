import { deriveActivityType } from './carbonAccounting.js';

export const mapOrganisation = (o: any) => ({
  id: o.id, name: o.name ?? '', industry: o.industry ?? '', location: o.location ?? '',
  employeeCount: Number(o.employee_count ?? 0), reportingYear: o.reporting_year ?? '',
  targetReductionPercent: Number(o.target_reduction_percent ?? 0),
  legalName: o.legal_name ?? '', subIndustry: o.sub_industry ?? '', country: o.country ?? 'India', state: o.state ?? '', city: o.city ?? '',
  currency: o.currency ?? 'INR', timeZone: o.time_zone ?? 'Asia/Kolkata', fiscalYear: o.fiscal_year ?? '', baseYear: o.base_year ?? '',
  reportingFramework: o.reporting_framework ?? '', organizationBoundary: o.organization_boundary ?? '', operationalBoundary: o.operational_boundary ?? '', businessDescription: o.business_description ?? '', website: o.website ?? '', logoUrl: o.logo_url ?? '',
});

export const mapFacility = (f: any) => ({
  id: f.id, organisationId: f.organisation_id, name: f.name ?? '', location: f.location ?? '',
  industryType: f.industry_type ?? '', productionOutput: Number(f.production_output ?? 0),
  productionUnit: f.production_unit ?? 'Tonnes', reportingPeriod: f.reporting_period ?? '',
  electricityConsumption: Number(f.electricity_consumption ?? 0),
  fuelConsumption: Number(f.fuel_consumption ?? 0), fuelType: f.fuel_type ?? 'Diesel',
  renewableEnergyUsage: Number(f.renewable_energy_usage ?? 0),
  emissionsScope1: Number(f.emissions_scope_1 ?? 0), emissionsScope2: Number(f.emissions_scope_2 ?? 0),
  carbonIntensity: Number(f.carbon_intensity ?? 0),
  esgReadinessStatus: f.esg_readiness_status ?? 'Needs Improvement',
  facilityCode: f.facility_code ?? '', plantType: f.plant_type ?? '', businessUnit: f.business_unit ?? '', address: f.address ?? '', country: f.country ?? 'India',
  latitude: f.latitude === null || f.latitude === undefined ? null : Number(f.latitude), longitude: f.longitude === null || f.longitude === undefined ? null : Number(f.longitude), operationalStatus: f.operational_status ?? 'active', operatingHours: f.operating_hours === null || f.operating_hours === undefined ? null : Number(f.operating_hours), commissionDate: f.commission_date ?? '', primaryProducts: f.primary_products ?? '', managerName: f.manager_name ?? '', reportingBoundary: f.reporting_boundary ?? '', archivedAt: f.archived_at ?? null,
});

export const mapEnergyRecord = (r: any) => ({
  id: r.id,
  organisationId: r.organisation_id,
  facilityId: r.facility_id,
  date: r.date,
  reportingPeriod: r.reporting_period ?? '',
  activityType: r.activity_type ?? deriveActivityType(r.source_type ?? r.energy_type ?? ''),
  sourceType: r.source_type ?? r.energy_type,
  energyType: r.energy_type ?? r.source_type,
  quantity: Number(r.quantity ?? 0),
  unit: r.unit ?? '',
  scope: r.scope ?? 'scope-1',
  emissionFactorId: r.emission_factor_id ?? r.audit_trail?.emissionFactorId ?? '',
  emissionFactorValue: Number(r.emission_factor_value ?? r.audit_trail?.emissionFactor ?? 0),
  emissionFactorUnit: r.emission_factor_unit ?? r.audit_trail?.factorUnit ?? '',
  emissionsKgCO2e: Number(r.emissions_kg_co2e ?? (Number(r.emissions ?? 0) * 1000)),
  emissionsTCO2e: Number(r.emissions_t_co2e ?? r.emissions ?? 0),
  sourceDocument: r.source_document ?? '',
  notes: r.notes ?? '',
  emissions: Number(r.emissions_t_co2e ?? r.emissions ?? 0),
  auditTrail: r.calculation_metadata ?? r.audit_trail ?? {},
});

export const mapESGQuestion = (q: any) => ({
  id: q.id,
  category: q.category,
  question: q.question,
  answer: q.answer ?? '',
  evidence: q.evidence ?? '',
  score: Number(q.score ?? 0),
  status: q.status ?? 'Partial',
  recommendation: q.recommendation ?? '',
  assignedUser: q.assigned_user ?? '',
  reviewStatus: q.review_status ?? 'Draft',
});

export const mapOEMQuestionnaire = (q: any) => ({
  id: q.id,
  organisationId: q.organisation_id,
  title: q.title,
  oemName: q.oem_name,
  dueDate: q.due_date,
  status: q.status ?? 'Not Started',
  questions: q.questions ?? [],
});

export const mapDocument = (d: any) => ({
  id: d.id,
  organisationId: d.organisation_id,
  name: d.name,
  category: d.category,
  uploadDate: d.upload_date,
  facilityId: d.facility_id ?? '',
  period: d.period ?? '',
  size: d.size ?? '',
  aiStatus: d.ai_status ?? 'Processed',
  evidenceUsage: d.evidence_usage ?? '',
});

export const mapReport = (r: any) => ({
  id: r.id,
  organisationId: r.organisation_id,
  title: r.title,
  type: r.type,
  period: r.period,
  createdDate: r.created_date,
  summary: r.summary ?? '',
  status: r.status ?? 'Generated',
  downloadUrl: r.download_url ?? '#',
});

export const mapProductionRecord = (r: any) => ({
  id: r.id,
  organisationId: r.organisation_id,
  facilityId: r.facility_id,
  date: r.date,
  reportingPeriod: r.reporting_period ?? '',
  quantity: Number(r.quantity ?? 0),
  unit: r.unit ?? '',
  sourceDocument: r.source_document ?? '',
  notes: r.notes ?? '',
});

export const mapDiagnosticResponse = (r: any) => ({
  id: r.id,
  organisationId: r.organisation_id,
  facilityId: r.facility_id ?? '',
  questionId: r.question_id,
  industry: r.industry,
  category: r.category,
  questionText: r.question_text,
  answerType: r.answer_type,
  answer: r.answer ?? '',
  evidenceReference: r.evidence_reference ?? '',
  updatedAt: r.updated_at,
});

export const mapFinding = (r: any) => ({
  id: r.id,
  organisationId: r.organisation_id,
  facilityId: r.facility_id ?? '',
  category: r.category,
  findingType: r.finding_type,
  severity: r.severity,
  title: r.title,
  description: r.description,
  metricName: r.metric_name ?? '',
  currentValue: r.current_value === null || r.current_value === undefined ? undefined : Number(r.current_value),
  previousValue: r.previous_value === null || r.previous_value === undefined ? undefined : Number(r.previous_value),
  unit: r.unit ?? '',
  evidence: r.evidence ?? {},
  calculationMetadata: r.calculation_metadata ?? {},
  generatedAt: r.generated_at,
});

export const mapOpportunity = (r: any) => ({
  id: r.id,
  organisationId: r.organisation_id,
  facilityId: r.facility_id ?? '',
  diagnosticFindingId: r.diagnostic_finding_id ?? '',
  title: r.title,
  category: r.category,
  source: r.source,
  description: r.description,
  rationale: r.rationale,
  status: r.status,
  confidence: r.confidence,
  engineeringAssessmentRequired: Boolean(r.engineering_assessment_required),
  estimatedAnnualReductionTCO2e: r.estimated_annual_reduction_t_co2e === null || r.estimated_annual_reduction_t_co2e === undefined ? undefined : Number(r.estimated_annual_reduction_t_co2e),
  estimatedAnnualEnergySavings: r.estimated_annual_energy_savings === null || r.estimated_annual_energy_savings === undefined ? undefined : Number(r.estimated_annual_energy_savings),
  energySavingsUnit: r.energy_savings_unit ?? '',
  estimatedCapex: r.estimated_capex === null || r.estimated_capex === undefined ? undefined : Number(r.estimated_capex),
  estimatedAnnualCostSavings: r.estimated_annual_cost_savings === null || r.estimated_annual_cost_savings === undefined ? undefined : Number(r.estimated_annual_cost_savings),
  simplePaybackYears: r.simple_payback_years === null || r.simple_payback_years === undefined ? undefined : Number(r.simple_payback_years),
  calculationMetadata: r.calculation_metadata ?? {},
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const mapScenario = (r: any) => ({
  id: r.id,
  organisationId: r.organisation_id,
  facilityId: r.facility_id ?? '',
  title: r.title,
  baselineStartDate: r.baseline_start_date,
  baselineEndDate: r.baseline_end_date,
  scenarioType: r.scenario_type,
  assumptions: r.assumptions ?? {},
  baselineEmissionsTCO2e: Number(r.baseline_emissions_t_co2e ?? 0),
  scenarioEmissionsTCO2e: Number(r.scenario_emissions_t_co2e ?? 0),
  estimatedReductionTCO2e: Number(r.estimated_reduction_t_co2e ?? 0),
  estimatedReductionPercent: Number(r.estimated_reduction_percent ?? 0),
  calculationMetadata: r.calculation_metadata ?? {},
  createdAt: r.created_at,
});

export const mapProject = (r: any) => ({
  id: r.id,
  organisationId: r.organisation_id,
  facilityId: r.facility_id ?? '',
  opportunityId: r.opportunity_id ?? '',
  scenarioId: r.scenario_id ?? '',
  title: r.title,
  description: r.description,
  category: r.category,
  status: r.status,
  owner: r.owner ?? '',
  baselineStartDate: r.baseline_start_date ?? '',
  baselineEndDate: r.baseline_end_date ?? '',
  plannedStartDate: r.planned_start_date ?? '',
  plannedCompletionDate: r.planned_completion_date ?? '',
  actualStartDate: r.actual_start_date ?? '',
  actualCompletionDate: r.actual_completion_date ?? '',
  targetAnnualReductionTCO2e: r.target_annual_reduction_t_co2e === null || r.target_annual_reduction_t_co2e === undefined ? undefined : Number(r.target_annual_reduction_t_co2e),
  estimatedCapex: r.estimated_capex === null || r.estimated_capex === undefined ? undefined : Number(r.estimated_capex),
  estimatedAnnualCostSavings: r.estimated_annual_cost_savings === null || r.estimated_annual_cost_savings === undefined ? undefined : Number(r.estimated_annual_cost_savings),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  milestones: r.project_milestones?.map(mapMilestone) ?? [],
  measurements: r.project_measurements?.map(mapMeasurement) ?? [],
});

export function mapMilestone(r: any): any {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    description: r.description ?? '',
    dueDate: r.due_date ?? '',
    completedAt: r.completed_at ?? '',
    status: r.status,
  };
}

export function mapMeasurement(r: any): any {
  return {
    id: r.id,
    projectId: r.project_id,
    measurementStartDate: r.measurement_start_date,
    measurementEndDate: r.measurement_end_date,
    expectedReductionPercent: Number(r.expected_reduction_percent ?? 0),
    baselineIntensity: Number(r.baseline_intensity ?? 0),
    observedIntensity: Number(r.observed_intensity ?? 0),
    observedImprovementPercent: Number(r.observed_improvement_percent ?? 0),
    variancePercentagePoints: Number(r.variance_percentage_points ?? 0),
    methodology: r.methodology,
    calculationMetadata: r.calculation_metadata ?? {},
  };
}
