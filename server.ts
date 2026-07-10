import express, { type NextFunction, type Request, type Response } from 'express';
import 'dotenv/config';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createClient, type User } from '@supabase/supabase-js';
import {
  aggregateFacilityActivities,
  calculateActivityEmissions,
  deriveActivityType,
  normalizeUnit,
  prototypeEmissionFactors,
  resolveEmissionFactor,
  type ActivityScope,
} from './server/carbonAccounting.js';
import {
  calculateDataCompleteness,
  calculateExpectedVsObserved,
  calculateReductionScenario,
  compareMonthlyPerformance,
  diagnosticQuestionTemplate,
  generateDiagnosticFindings,
  type DiagnosticQuestionResponse,
  type ScenarioType,
} from './server/phase2CarbonIntelligence.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables.');
}

const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

interface AuthenticatedRequest extends Request { authUser?: User; }
interface Profile {
  id: string; full_name: string; organisation_id: string; role: string; created_at: string;
}

const mapOrganisation = (o: any) => ({
  id: o.id, name: o.name ?? '', industry: o.industry ?? '', location: o.location ?? '',
  employeeCount: Number(o.employee_count ?? 0), reportingYear: o.reporting_year ?? '',
  targetReductionPercent: Number(o.target_reduction_percent ?? 0),
});

const mapFacility = (f: any) => ({
  id: f.id, organisationId: f.organisation_id, name: f.name ?? '', location: f.location ?? '',
  industryType: f.industry_type ?? '', productionOutput: Number(f.production_output ?? 0),
  productionUnit: f.production_unit ?? 'Tonnes', reportingPeriod: f.reporting_period ?? '',
  electricityConsumption: Number(f.electricity_consumption ?? 0),
  fuelConsumption: Number(f.fuel_consumption ?? 0), fuelType: f.fuel_type ?? 'Diesel',
  renewableEnergyUsage: Number(f.renewable_energy_usage ?? 0),
  emissionsScope1: Number(f.emissions_scope_1 ?? 0), emissionsScope2: Number(f.emissions_scope_2 ?? 0),
  carbonIntensity: Number(f.carbon_intensity ?? 0),
  esgReadinessStatus: f.esg_readiness_status ?? 'Needs Improvement',
});

const mapEnergyRecord = (r: any) => ({
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
  scope: r.scope ?? (resolveEmissionFactor(r.source_type ?? r.energy_type ?? '')?.scope ?? 'scope-1'),
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

const mapESGQuestion = (q: any) => ({
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

const mapOEMQuestionnaire = (q: any) => ({
  id: q.id,
  organisationId: q.organisation_id,
  title: q.title,
  oemName: q.oem_name,
  dueDate: q.due_date,
  status: q.status ?? 'Not Started',
  questions: q.questions ?? [],
});

const mapDocument = (d: any) => ({
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

const mapReport = (r: any) => ({
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

const mapProductionRecord = (r: any) => ({
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

const mapDiagnosticResponse = (r: any) => ({
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

const mapFinding = (r: any) => ({
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

const mapOpportunity = (r: any) => ({
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

const mapScenario = (r: any) => ({
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

const mapProject = (r: any) => ({
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

function mapMilestone(r: any): any {
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

function mapMeasurement(r: any): any {
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

function bearer(req: Request) {
  const h = req.headers.authorization;
  return h?.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null;
}
async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  req.authUser = data.user;
  next();
}
async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) throw new Error(`Profile lookup failed: ${error?.message ?? 'not found'}`);
  return data as Profile;
}
const str = (a: unknown, b?: unknown) =>
  (typeof a === 'string' ? a : typeof b === 'string' ? b : '').trim();
const num = (a: unknown, b?: unknown) => {
  const raw = a ?? b ?? 0; const n = Number(raw); return Number.isFinite(n) ? n : 0;
};
const optionalFinite = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error('Numeric values must be finite.');
  return n;
};
const requiredFinite = (value: unknown, label: string) => {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${label} must be finite.`);
  return n;
};

async function ensureFacility(organisationId: string, facilityId?: string | null) {
  if (!facilityId) return null;
  const { data, error } = await supabaseAdmin
    .from('facilities')
    .select('id')
    .eq('id', facilityId)
    .eq('organisation_id', organisationId)
    .single();
  if (error || !data) throw new Error('Facility not found for this organisation.');
  return data;
}

async function loadIntelligenceInputs(organisationId: string, facilityId?: string, startDate?: string, endDate?: string) {
  let energyQuery = supabaseAdmin.from('energy_records').select('*').eq('organisation_id', organisationId);
  let productionQuery = supabaseAdmin.from('production_records').select('*').eq('organisation_id', organisationId);
  let responseQuery = supabaseAdmin.from('diagnostic_question_responses').select('*').eq('organisation_id', organisationId);
  if (facilityId) {
    energyQuery = energyQuery.eq('facility_id', facilityId);
    productionQuery = productionQuery.eq('facility_id', facilityId);
    responseQuery = responseQuery.eq('facility_id', facilityId);
  }
  if (startDate) {
    energyQuery = energyQuery.gte('date', startDate);
    productionQuery = productionQuery.gte('date', startDate);
  }
  if (endDate) {
    energyQuery = energyQuery.lte('date', endDate);
    productionQuery = productionQuery.lte('date', endDate);
  }
  const [energy, production, responses] = await Promise.all([energyQuery, productionQuery, responseQuery]);
  if (energy.error) throw new Error(energy.error.message);
  if (production.error) throw new Error(production.error.message);
  if (responses.error) throw new Error(responses.error.message);
  return {
    activityRecords: (energy.data ?? []).map(mapEnergyRecord),
    productionRecords: (production.data ?? []).map(mapProductionRecord),
    questionnaireResponses: (responses.data ?? []).map(mapDiagnosticResponse) as DiagnosticQuestionResponse[],
  };
}

const FUEL_EMISSION_FACTORS: Record<string, number> = Object.fromEntries(
  prototypeEmissionFactors.filter((factor) => factor.scope === 'scope-1').map((factor) => [factor.sourceType, factor.factorValue]),
);

const GRID_ELECTRICITY_FACTOR = resolveEmissionFactor('Grid Electricity')?.factorValue ?? 0.716;

function calculateFacilityEmissions(input: {
  productionOutput: number;
  electricityConsumption: number;
  fuelConsumption: number;
  fuelType: string;
  renewableEnergyUsage: number;
}) {
  const gridElectricity = Math.max(0, input.electricityConsumption - input.renewableEnergyUsage);
  const fuelFactor = FUEL_EMISSION_FACTORS[input.fuelType] ?? 0;

  const emissionsScope1 = (input.fuelConsumption * fuelFactor) / 1000;
  const emissionsScope2 = (gridElectricity * GRID_ELECTRICITY_FACTOR) / 1000;
  const totalFootprint = emissionsScope1 + emissionsScope2;
  const carbonIntensity = input.productionOutput > 0
    ? totalFootprint / input.productionOutput
    : 0;

  return {
    emissionsScope1: Number(emissionsScope1.toFixed(4)),
    emissionsScope2: Number(emissionsScope2.toFixed(4)),
    totalFootprint: Number(totalFootprint.toFixed(4)),
    carbonIntensity: Number(carbonIntensity.toFixed(4)),
  };
}

async function refreshFacilityAggregates(organisationId: string, facilityId: string) {
  const { data: facility, error: facilityError } = await supabaseAdmin
    .from('facilities')
    .select('*')
    .eq('id', facilityId)
    .eq('organisation_id', organisationId)
    .single();
  if (facilityError || !facility) return;

  const { data: records, error: recordsError } = await supabaseAdmin
    .from('energy_records')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('facility_id', facilityId);
  if (recordsError) return;

  const aggregate = aggregateFacilityActivities(
    (records ?? []).map((record) => ({
      facilityId: record.facility_id,
      sourceType: record.source_type ?? record.energy_type,
      quantity: Number(record.quantity ?? 0),
      unit: record.unit ?? '',
      scope: (record.scope ?? resolveEmissionFactor(record.source_type ?? record.energy_type ?? '')?.scope ?? 'scope-1') as ActivityScope,
      emissionsTCO2e: Number(record.emissions_t_co2e ?? record.emissions ?? 0),
    })),
    Number(facility.production_output ?? 0),
    facility.production_unit ?? '',
  );

  await supabaseAdmin
    .from('facilities')
    .update({
      electricity_consumption: aggregate.electricityConsumption,
      renewable_energy_usage: aggregate.renewableEnergyUsage,
      fuel_consumption: aggregate.fuelConsumption,
      fuel_type: aggregate.fuelType,
      emissions_scope_1: aggregate.emissionsScope1,
      emissions_scope_2: aggregate.emissionsScope2,
      carbon_intensity: aggregate.carbonIntensity,
    })
    .eq('id', facilityId)
    .eq('organisation_id', organisationId);
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Balancing Carbon API' }));

app.post('/api/auth/signup', async (req, res) => {
  let userId: string | null = null, orgId: string | null = null;
  try {
    const { name, email, password, organisationName } = req.body ?? {};
    if (!str(name) || !str(email) || !str(organisationName) || typeof password !== 'string' || password.length < 8)
      return res.status(400).json({ error: 'Name, valid email, organisation name, and password of at least 8 characters are required.' });

    const normalizedEmail = str(email).toLowerCase();
    const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail, password, email_confirm: true,
      user_metadata: { full_name: str(name), organisation_name: str(organisationName) },
    });
    if (authError || !auth.user) return res.status(400).json({ error: authError?.message ?? 'Unable to create account.' });
    userId = auth.user.id;
    orgId = `org-${randomUUID()}`;

    const { data: org, error: orgError } = await supabaseAdmin.from('organisations')
      .insert({ id: orgId, name: str(organisationName) }).select('*').single();
    if (orgError || !org) throw new Error(`Organisation creation failed: ${orgError?.message ?? 'unknown error'}`);

    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId, full_name: str(name), organisation_id: orgId, role: 'organisation_admin',
    }).select('*').single();
    if (profileError || !profile) throw new Error(`Profile creation failed: ${profileError?.message ?? 'unknown error'}`);

    const { data: session, error: sessionError } = await supabaseAuth.auth.signInWithPassword({ email: normalizedEmail, password });
    if (sessionError || !session.session) throw new Error(`Automatic login failed: ${sessionError?.message ?? 'no session'}`);

    return res.status(201).json({
      authenticated: true, accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token, expiresAt: session.session.expires_at,
      user: { id: userId, name: profile.full_name, email: normalizedEmail, role: profile.role, organisationId: orgId },
      organisation: mapOrganisation(org),
    });
  } catch (e) {
    if (orgId) await supabaseAdmin.from('organisations').delete().eq('id', orgId);
    if (userId) await supabaseAdmin.auth.admin.deleteUser(userId);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = str(req.body?.email).toLowerCase(), password = req.body?.password;
  if (!email || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required.' });
  const { data: auth, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error || !auth.user || !auth.session) return res.status(401).json({ error: 'Invalid email or password.' });
  const profile = await getProfile(auth.user.id);
  const { data: org } = await supabaseAdmin.from('organisations').select('*').eq('id', profile.organisation_id).single();
  return res.json({
    authenticated: true, accessToken: auth.session.access_token, refreshToken: auth.session.refresh_token,
    expiresAt: auth.session.expires_at,
    user: { id: auth.user.id, name: profile.full_name, email: auth.user.email, role: profile.role, organisationId: profile.organisation_id },
    organisation: org ? mapOrganisation(org) : null,
  });
});

app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const p = await getProfile(req.authUser!.id);
  res.json({ authenticated: true, user: { id: p.id, name: p.full_name, email: req.authUser!.email, role: p.role, organisationId: p.organisation_id } });
});

app.get('/api/organisation', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    const { data, error } = await supabaseAdmin.from('organisations').select('*').eq('id', p.organisation_id).single();
    if (error || !data) return res.status(404).json({ error: 'Organisation not found.' });
    res.json(mapOrganisation(data));
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load organisation.' }); }
});

app.post('/api/organisation', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    const b = req.body ?? {};
    const updates: any = {};
    if (b.name !== undefined) updates.name = str(b.name);
    if (b.industry !== undefined) updates.industry = str(b.industry);
    if (b.location !== undefined) updates.location = str(b.location);
    if (b.employeeCount !== undefined) updates.employee_count = num(b.employeeCount);
    if (b.reportingYear !== undefined) updates.reporting_year = str(b.reportingYear);
    if (b.targetReductionPercent !== undefined) updates.target_reduction_percent = num(b.targetReductionPercent);
    const { data, error } = await supabaseAdmin.from('organisations').update(updates).eq('id', p.organisation_id).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Update failed.' });
    res.json(mapOrganisation(data));
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Update failed.' }); }
});

app.get('/api/facilities', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    const { data, error } = await supabaseAdmin.from('facilities').select('*').eq('organisation_id', p.organisation_id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ facilities: (data ?? []).map(mapFacility) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load facilities.' }); }
});

app.post('/api/facilities', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const name = str(b.name), location = str(b.location), industryType = str(b.industryType, b.industry_type);
    if (!name || !location || !industryType) return res.status(400).json({ error: 'Facility name, location and industry type are required.' });

    const reportingPeriod = str(b.reportingPeriod, b.reporting_period) || new Date().getFullYear().toString();
    const productionOutput = num(b.productionOutput, b.production_output);
    const electricity = num(b.electricityConsumption, b.electricity_consumption);
    const fuel = num(b.fuelConsumption, b.fuel_consumption);
    const renewable = num(b.renewableEnergyUsage, b.renewable_energy_usage);
    const fuelType = str(b.fuelType, b.fuel_type) || 'Diesel';
    const calculations = calculateFacilityEmissions({
      productionOutput,
      electricityConsumption: electricity,
      fuelConsumption: fuel,
      fuelType,
      renewableEnergyUsage: renewable,
    });
    const scope1 = calculations.emissionsScope1;
    const scope2 = calculations.emissionsScope2;
    const intensity = calculations.carbonIntensity;

    const row = {
      id: `fac-${randomUUID()}`, organisation_id: p.organisation_id, name, location,
      industry_type: industryType, production_output: productionOutput,
      production_unit: str(b.productionUnit, b.production_unit) || 'Tonnes',
      reporting_period: reportingPeriod, electricity_consumption: electricity,
      fuel_consumption: fuel, fuel_type: fuelType,
      renewable_energy_usage: renewable, emissions_scope_1: scope1, emissions_scope_2: scope2,
      carbon_intensity: intensity, esg_readiness_status: str(b.esgReadinessStatus, b.esg_readiness_status) || 'Needs Improvement',
    };
    const { data, error } = await supabaseAdmin.from('facilities').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: `Failed to create facility: ${error?.message ?? 'unknown error'}` });
    res.status(201).json({ success: true, facility: mapFacility(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create facility.' }); }
});

app.patch('/api/facilities/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    const b = req.body ?? {};

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('facilities').select('*').eq('id', req.params.id)
      .eq('organisation_id', p.organisation_id).single();

    if (fetchError || !existing) return res.status(404).json({ error: 'Facility not found.' });

    const u: any = {};
    const mappings: [string, string, 's' | 'n'][] = [
      ['name','name','s'], ['location','location','s'], ['industryType','industry_type','s'],
      ['productionOutput','production_output','n'], ['productionUnit','production_unit','s'],
      ['reportingPeriod','reporting_period','s'], ['electricityConsumption','electricity_consumption','n'],
      ['fuelConsumption','fuel_consumption','n'], ['fuelType','fuel_type','s'],
      ['renewableEnergyUsage','renewable_energy_usage','n'],
      ['esgReadinessStatus','esg_readiness_status','s'],
    ];

    for (const [front, db, kind] of mappings) {
      if (b[front] !== undefined) u[db] = kind === 'n' ? num(b[front]) : str(b[front]);
    }

    const productionOutput = u.production_output ?? Number(existing.production_output ?? 0);
    const electricityConsumption = u.electricity_consumption ?? Number(existing.electricity_consumption ?? 0);
    const fuelConsumption = u.fuel_consumption ?? Number(existing.fuel_consumption ?? 0);
    const fuelType = u.fuel_type ?? existing.fuel_type ?? 'Diesel';
    const renewableEnergyUsage = u.renewable_energy_usage ?? Number(existing.renewable_energy_usage ?? 0);

    const calculations = calculateFacilityEmissions({
      productionOutput,
      electricityConsumption,
      fuelConsumption,
      fuelType,
      renewableEnergyUsage,
    });

    u.emissions_scope_1 = calculations.emissionsScope1;
    u.emissions_scope_2 = calculations.emissionsScope2;
    u.carbon_intensity = calculations.carbonIntensity;

    const { data, error } = await supabaseAdmin.from('facilities').update(u)
      .eq('id', req.params.id).eq('organisation_id', p.organisation_id)
      .select('*').single();

    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Update failed.' });

    res.json({
      success: true,
      facility: mapFacility(data),
      calculation: {
        totalFootprint: calculations.totalFootprint,
        scope1: calculations.emissionsScope1,
        scope2: calculations.emissionsScope2,
        carbonIntensity: calculations.carbonIntensity,
        methodology: 'Activity data × emission factor',
        gridEmissionFactor: GRID_ELECTRICITY_FACTOR,
        fuelEmissionFactor: FUEL_EMISSION_FACTORS[fuelType] ?? 0,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Update failed.' });
  }
});

app.delete('/api/facilities/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    const { data, error } = await supabaseAdmin.from('facilities').delete().eq('id', req.params.id).eq('organisation_id', p.organisation_id).select('id').maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Facility not found.' });
    res.json({ success: true, deletedFacilityId: req.params.id });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Delete failed.' }); }
});

app.get('/api/energy', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    let query = supabaseAdmin
      .from('energy_records')
      .select('*')
      .eq('organisation_id', p.organisation_id);

    if (typeof req.query.facilityId === 'string') query = query.eq('facility_id', req.query.facilityId);
    if (typeof req.query.reportingPeriod === 'string') query = query.eq('reporting_period', req.query.reportingPeriod);
    if (typeof req.query.sourceType === 'string') query = query.eq('source_type', req.query.sourceType);
    if (typeof req.query.scope === 'string') query = query.eq('scope', req.query.scope);
    if (typeof req.query.dateFrom === 'string') query = query.gte('date', req.query.dateFrom);
    if (typeof req.query.dateTo === 'string') query = query.lte('date', req.query.dateTo);

    const filtered = await query.order('date', { ascending: false });
    if (filtered.error) return res.status(500).json({ error: filtered.error.message });
    res.json({ records: (filtered.data ?? []).map(mapEnergyRecord) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load energy records.' }); }
});

app.post('/api/energy', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const facilityId = str(b.facilityId, b.facility_id);
    const sourceType = str(b.sourceType, b.source_type) || str(b.energyType, b.energy_type);
    const quantity = Number(b.quantity);
    if (!facilityId || !sourceType || !Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'Facility, source type, and non-negative finite quantity are required.' });
    }

    const { data: facility, error: facilityError } = await supabaseAdmin
      .from('facilities')
      .select('*')
      .eq('id', facilityId)
      .eq('organisation_id', p.organisation_id)
      .single();
    if (facilityError || !facility) return res.status(404).json({ error: 'Facility not found.' });

    const factor = resolveEmissionFactor(sourceType);
    if (!factor) return res.status(400).json({ error: `No active emission factor found for source type: ${sourceType}.` });
    const activityType = str(b.activityType, b.activity_type) || deriveActivityType(sourceType);
    const requestedUnit = str(b.unit) || factor.activityUnit;
    let calculation;
    try {
      calculation = calculateActivityEmissions({
        quantity,
        activityUnit: requestedUnit,
        sourceType,
        emissionFactor: factor,
      });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid activity record.' });
    }

    const calculationMetadata = {
      methodology: 'activity_data_x_emission_factor',
      quantity: calculation.quantity,
      activityUnit: calculation.normalizedUnit,
      sourceType,
      scope: factor.scope,
      emissionFactorId: calculation.emissionFactorId,
      emissionFactorValue: calculation.emissionFactorValue,
      emissionFactorUnit: calculation.emissionFactorUnit,
      emissionsKgCO2e: calculation.emissionsKgCO2e,
      emissionsTCO2e: calculation.emissionsTCO2e,
      factorSource: calculation.factorSource,
      factorVersion: calculation.factorVersion,
      calculatedAt: calculation.calculatedAt,
    };

    const row = {
      id: `rec-${randomUUID()}`,
      organisation_id: p.organisation_id,
      facility_id: facilityId,
      date: str(b.date) || new Date().toISOString().split('T')[0],
      reporting_period: str(b.reportingPeriod, b.reporting_period) || facility.reporting_period || new Date().getFullYear().toString(),
      activity_type: activityType,
      source_type: sourceType,
      energy_type: sourceType,
      quantity,
      unit: calculation.normalizedUnit,
      scope: factor.scope,
      emission_factor_id: calculation.emissionFactorId,
      emission_factor_value: calculation.emissionFactorValue,
      emission_factor_unit: calculation.emissionFactorUnit,
      emissions_kg_co2e: calculation.emissionsKgCO2e,
      emissions_t_co2e: calculation.emissionsTCO2e,
      source_document: str(b.sourceDocument, b.source_document) || 'Manual Entry',
      notes: str(b.notes),
      emissions: calculation.emissionsTCO2e,
      audit_trail: calculationMetadata,
      calculation_metadata: calculationMetadata,
    };

    const { data, error } = await supabaseAdmin.from('energy_records').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create energy record.' });

    await refreshFacilityAggregates(p.organisation_id, facilityId);

    res.status(201).json({ success: true, record: mapEnergyRecord(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create energy record.' }); }
});

app.patch('/api/energy/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('energy_records')
      .select('*')
      .eq('id', req.params.id)
      .eq('organisation_id', p.organisation_id)
      .single();
    if (existingError || !existing) return res.status(404).json({ error: 'Energy record not found.' });

    const sourceType = str(b.sourceType, b.source_type) || str(b.energyType, b.energy_type) || existing.source_type || existing.energy_type;
    const quantity = b.quantity !== undefined ? Number(b.quantity) : Number(existing.quantity ?? 0);
    const factor = resolveEmissionFactor(sourceType);
    if (!factor) return res.status(400).json({ error: `No active emission factor found for source type: ${sourceType}.` });
    const requestedUnit = str(b.unit) || existing.unit || factor.activityUnit;
    let calculation;
    try {
      calculation = calculateActivityEmissions({ quantity, activityUnit: requestedUnit, sourceType, emissionFactor: factor });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid activity record.' });
    }

    const calculationMetadata = {
      methodology: 'activity_data_x_emission_factor',
      quantity: calculation.quantity,
      activityUnit: calculation.normalizedUnit,
      sourceType,
      scope: factor.scope,
      emissionFactorId: calculation.emissionFactorId,
      emissionFactorValue: calculation.emissionFactorValue,
      emissionFactorUnit: calculation.emissionFactorUnit,
      emissionsKgCO2e: calculation.emissionsKgCO2e,
      emissionsTCO2e: calculation.emissionsTCO2e,
      factorSource: calculation.factorSource,
      factorVersion: calculation.factorVersion,
      calculatedAt: calculation.calculatedAt,
    };

    const updates = {
      date: str(b.date) || existing.date,
      reporting_period: str(b.reportingPeriod, b.reporting_period) || existing.reporting_period,
      activity_type: str(b.activityType, b.activity_type) || deriveActivityType(sourceType),
      source_type: sourceType,
      energy_type: sourceType,
      quantity,
      unit: calculation.normalizedUnit,
      scope: factor.scope,
      emission_factor_id: calculation.emissionFactorId,
      emission_factor_value: calculation.emissionFactorValue,
      emission_factor_unit: calculation.emissionFactorUnit,
      emissions_kg_co2e: calculation.emissionsKgCO2e,
      emissions_t_co2e: calculation.emissionsTCO2e,
      source_document: str(b.sourceDocument, b.source_document) || existing.source_document,
      notes: b.notes !== undefined ? str(b.notes) : existing.notes,
      emissions: calculation.emissionsTCO2e,
      audit_trail: calculationMetadata,
      calculation_metadata: calculationMetadata,
    };

    const { data, error } = await supabaseAdmin
      .from('energy_records')
      .update(updates)
      .eq('id', req.params.id)
      .eq('organisation_id', p.organisation_id)
      .select('*')
      .single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to update energy record.' });
    await refreshFacilityAggregates(p.organisation_id, existing.facility_id);
    res.json({ success: true, record: mapEnergyRecord(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to update energy record.' }); }
});

app.delete('/api/energy/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('energy_records')
      .select('id, facility_id')
      .eq('id', req.params.id)
      .eq('organisation_id', p.organisation_id)
      .single();
    if (existingError || !existing) return res.status(404).json({ error: 'Energy record not found.' });
    const { error } = await supabaseAdmin
      .from('energy_records')
      .delete()
      .eq('id', req.params.id)
      .eq('organisation_id', p.organisation_id);
    if (error) return res.status(500).json({ error: error.message });
    await refreshFacilityAggregates(p.organisation_id, existing.facility_id);
    res.json({ success: true, deletedRecordId: req.params.id });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to delete energy record.' }); }
});

app.get('/api/emission-factors', requireAuth, (_req, res) => {
  res.json({ factors: prototypeEmissionFactors });
});

app.get('/api/production', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    let query = supabaseAdmin
      .from('production_records')
      .select('*')
      .eq('organisation_id', p.organisation_id);
    if (typeof req.query.facilityId === 'string') query = query.eq('facility_id', req.query.facilityId);
    if (typeof req.query.reportingPeriod === 'string') query = query.eq('reporting_period', req.query.reportingPeriod);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ records: (data ?? []).map(mapProductionRecord) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load production records.' }); }
});

app.post('/api/production', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const facilityId = str(b.facilityId, b.facility_id);
    const quantity = Number(b.quantity);
    const unit = str(b.unit);
    if (!facilityId || !Number.isFinite(quantity) || quantity < 0 || !unit) {
      return res.status(400).json({ error: 'Facility, non-negative finite quantity, and production unit are required.' });
    }
    const { data: facility, error: facilityError } = await supabaseAdmin
      .from('facilities')
      .select('id')
      .eq('id', facilityId)
      .eq('organisation_id', p.organisation_id)
      .single();
    if (facilityError || !facility) return res.status(404).json({ error: 'Facility not found.' });

    const row = {
      id: `prod-${randomUUID()}`,
      organisation_id: p.organisation_id,
      facility_id: facilityId,
      date: str(b.date) || new Date().toISOString().split('T')[0],
      reporting_period: str(b.reportingPeriod, b.reporting_period) || 'FY 2025-26',
      quantity,
      unit,
      source_document: str(b.sourceDocument, b.source_document),
      notes: str(b.notes),
    };
    const { data, error } = await supabaseAdmin.from('production_records').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create production record.' });
    res.status(201).json({ success: true, record: mapProductionRecord(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create production record.' }); }
});

app.get('/api/esg', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    const { data, error } = await supabaseAdmin
      .from('esg_questions')
      .select('*')
      .eq('organisation_id', p.organisation_id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ questions: (data ?? []).map(mapESGQuestion) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load ESG questions.' }); }
});

app.put('/api/esg/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const updates: any = {};
    if (b.category !== undefined) updates.category = str(b.category);
    if (b.question !== undefined) updates.question = str(b.question);
    if (b.answer !== undefined) updates.answer = str(b.answer);
    if (b.evidence !== undefined) updates.evidence = str(b.evidence);
    if (b.score !== undefined) updates.score = num(b.score);
    if (b.status !== undefined) updates.status = str(b.status);
    if (b.recommendation !== undefined) updates.recommendation = str(b.recommendation);
    if (b.assignedUser !== undefined) updates.assigned_user = str(b.assignedUser);
    if (b.reviewStatus !== undefined) updates.review_status = str(b.reviewStatus);
    const { data, error } = await supabaseAdmin
      .from('esg_questions')
      .update(updates)
      .eq('id', req.params.id)
      .eq('organisation_id', p.organisation_id)
      .select('*')
      .single();
    if (error || !data) return res.status(404).json({ error: error?.message ?? 'ESG question not found.' });
    res.json(mapESGQuestion(data));
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to update ESG question.' }); }
});

app.get('/api/oem-surveys', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    const { data, error } = await supabaseAdmin
      .from('oem_questionnaires')
      .select('*')
      .eq('organisation_id', p.organisation_id)
      .order('due_date', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ surveys: (data ?? []).map(mapOEMQuestionnaire) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load OEM surveys.' }); }
});

app.post('/api/oem-surveys', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const title = str(b.title), oemName = str(b.oemName, b.oem_name), dueDate = str(b.dueDate, b.due_date);
    if (!title || !oemName || !dueDate) return res.status(400).json({ error: 'Title, OEM name, and due date are required.' });
    const row = {
      id: `oem-${randomUUID()}`,
      organisation_id: p.organisation_id,
      title,
      oem_name: oemName,
      due_date: dueDate,
      status: 'Not Started',
      questions: [
        {
          id: `oemq-${randomUUID()}`,
          question: 'Do you systematically assess the carbon footprint of your raw material shipments?',
          category: 'Scope 3 Supply Chain',
          suggestedAnswer: 'We are preparing supplier-level emissions collection and will update this answer after primary data is reviewed.',
          evidenceSource: 'Supplier Engagement Plan Draft',
          confidence: 'Medium',
          status: 'Draft',
        },
      ],
    };
    const { data, error } = await supabaseAdmin.from('oem_questionnaires').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create OEM survey.' });
    res.status(201).json({ success: true, survey: mapOEMQuestionnaire(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create OEM survey.' }); }
});

app.post('/api/oem-surveys/:id/approve-question', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const questionId = str(b.questionId, b.question_id);
    if (!questionId) return res.status(400).json({ error: 'Question id is required.' });
    const { data: survey, error: surveyError } = await supabaseAdmin
      .from('oem_questionnaires')
      .select('*')
      .eq('id', req.params.id)
      .eq('organisation_id', p.organisation_id)
      .single();
    if (surveyError || !survey) return res.status(404).json({ error: 'OEM survey not found.' });

    let approved = 0;
    const questions = (survey.questions ?? []).map((q: any) => {
      const next = q.id === questionId
        ? { ...q, status: str(b.status) || 'Approved', ...(b.suggestedAnswer !== undefined ? { suggestedAnswer: str(b.suggestedAnswer) } : {}) }
        : q;
      if (next.status === 'Approved') approved += 1;
      return next;
    });
    const status = questions.length > 0 && approved === questions.length ? 'Completed' : 'In Progress';

    const { data, error } = await supabaseAdmin
      .from('oem_questionnaires')
      .update({ questions, status })
      .eq('id', req.params.id)
      .eq('organisation_id', p.organisation_id)
      .select('*')
      .single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to update OEM question.' });
    res.json({ success: true, survey: mapOEMQuestionnaire(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to update OEM question.' }); }
});

app.get('/api/documents', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('organisation_id', p.organisation_id)
      .order('upload_date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ documents: (data ?? []).map(mapDocument) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load documents.' }); }
});

app.post('/api/documents', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const name = str(b.name);
    if (!name) return res.status(400).json({ error: 'Document name is required.' });
    const row = {
      id: `doc-${randomUUID()}`,
      organisation_id: p.organisation_id,
      name,
      category: str(b.category) || 'Other',
      upload_date: str(b.uploadDate, b.upload_date) || new Date().toISOString().split('T')[0],
      facility_id: str(b.facilityId, b.facility_id) || null,
      period: str(b.period) || 'FY 2025-26',
      size: str(b.size) || 'Unknown',
      ai_status: str(b.aiStatus, b.ai_status) || 'Processed',
      evidence_usage: str(b.evidenceUsage, b.evidence_usage) || str(b.notes),
    };
    const { data, error } = await supabaseAdmin.from('documents').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create document.' });
    res.status(201).json({ success: true, document: mapDocument(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create document.' }); }
});

app.delete('/api/documents/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    const { data, error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', req.params.id)
      .eq('organisation_id', p.organisation_id)
      .select('id')
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Document not found.' });
    res.json({ success: true, deletedDocumentId: req.params.id });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to delete document.' }); }
});

app.get('/api/reports', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    const { data, error } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('organisation_id', p.organisation_id)
      .order('created_date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ reports: (data ?? []).map(mapReport) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load reports.' }); }
});

app.post('/api/reports', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const title = str(b.title);
    if (!title) return res.status(400).json({ error: 'Report title is required.' });
    const row = {
      id: `rep-${randomUUID()}`,
      organisation_id: p.organisation_id,
      title,
      type: str(b.type) || 'Executive Summary',
      period: str(b.period) || 'FY 2025-26',
      created_date: new Date().toISOString().split('T')[0],
      summary: str(b.summary),
      status: 'Generated',
      download_url: '#',
    };
    const { data, error } = await supabaseAdmin.from('reports').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create report.' });
    res.status(201).json({ success: true, report: mapReport(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create report.' }); }
});

app.get('/api/diagnostic-questions', requireAuth, (_req, res) => {
  res.json({ questions: diagnosticQuestionTemplate });
});

app.get('/api/diagnostic-responses', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    let query = supabaseAdmin.from('diagnostic_question_responses').select('*').eq('organisation_id', p.organisation_id);
    if (typeof req.query.facilityId === 'string') query = query.eq('facility_id', req.query.facilityId);
    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ responses: (data ?? []).map(mapDiagnosticResponse) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load diagnostic responses.' }); }
});

app.post('/api/diagnostic-responses', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const questionId = str(b.questionId, b.question_id);
    const template = diagnosticQuestionTemplate.find((question) => question.questionId === questionId);
    if (!template) return res.status(400).json({ error: 'Unknown diagnostic question id.' });
    const facilityId = str(b.facilityId, b.facility_id) || null;
    await ensureFacility(p.organisation_id, facilityId);
    let existingResponseQuery = supabaseAdmin
      .from('diagnostic_question_responses')
      .select('id')
      .eq('organisation_id', p.organisation_id)
      .eq('question_id', questionId);
    existingResponseQuery = facilityId ? existingResponseQuery.eq('facility_id', facilityId) : existingResponseQuery.is('facility_id', null);
    const { data: existingResponse } = await existingResponseQuery.maybeSingle();
    const row = {
      id: existingResponse?.id ?? str(b.id) ?? `diag-res-${randomUUID()}`,
      organisation_id: p.organisation_id,
      facility_id: facilityId,
      question_id: questionId,
      industry: template.industry,
      category: template.category,
      question_text: template.questionText,
      answer_type: template.answerType,
      answer: str(b.answer),
      evidence_reference: str(b.evidenceReference, b.evidence_reference),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = existingResponse?.id
      ? await supabaseAdmin.from('diagnostic_question_responses').update(row).eq('id', existingResponse.id).eq('organisation_id', p.organisation_id).select('*').single()
      : await supabaseAdmin.from('diagnostic_question_responses').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to save diagnostic response.' });
    res.status(201).json({ success: true, response: mapDiagnosticResponse(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to save diagnostic response.' }); }
});

app.get('/api/diagnostics', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    const facilityId = typeof req.query.facilityId === 'string' ? req.query.facilityId : undefined;
    await ensureFacility(p.organisation_id, facilityId);
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : '2026-01-01';
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : '2026-12-31';
    const inputs = await loadIntelligenceInputs(p.organisation_id, facilityId, startDate, endDate);
    const findings = generateDiagnosticFindings({
      organisationId: p.organisation_id,
      facilityId,
      activityRecords: inputs.activityRecords,
      productionRecords: inputs.productionRecords,
      questionnaireResponses: inputs.questionnaireResponses,
      startDate,
      endDate,
      currentMonth: typeof req.query.currentMonth === 'string' ? req.query.currentMonth : undefined,
      previousMonth: typeof req.query.previousMonth === 'string' ? req.query.previousMonth : undefined,
    });
    const completeness = calculateDataCompleteness({ ...inputs, startDate, endDate });
    const comparison = typeof req.query.currentMonth === 'string' && typeof req.query.previousMonth === 'string'
      ? compareMonthlyPerformance({ ...inputs, currentMonth: req.query.currentMonth, previousMonth: req.query.previousMonth })
      : null;
    res.json({ findings, completeness, comparison, questions: diagnosticQuestionTemplate, responses: inputs.questionnaireResponses });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to generate diagnostics.' }); }
});

app.get('/api/opportunities', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    let query = supabaseAdmin.from('reduction_opportunities').select('*').eq('organisation_id', p.organisation_id);
    if (typeof req.query.status === 'string') query = query.eq('status', req.query.status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ opportunities: (data ?? []).map(mapOpportunity) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load opportunities.' }); }
});

app.post('/api/opportunities', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const facilityId = str(b.facilityId, b.facility_id) || null;
    await ensureFacility(p.organisation_id, facilityId);
    const title = str(b.title);
    if (!title) return res.status(400).json({ error: 'Opportunity title is required.' });
    const row = {
      id: `opp-${randomUUID()}`,
      organisation_id: p.organisation_id,
      facility_id: facilityId,
      diagnostic_finding_id: null,
      title,
      category: str(b.category) || 'Data quality improvement',
      source: str(b.source) || 'manual',
      description: str(b.description) || 'Potential investigation area - engineering assessment required.',
      rationale: str(b.rationale) || 'Created from diagnostic workflow.',
      status: str(b.status) || 'identified',
      confidence: str(b.confidence) || 'medium',
      engineering_assessment_required: b.engineeringAssessmentRequired ?? b.engineering_assessment_required ?? true,
      estimated_annual_reduction_t_co2e: optionalFinite(b.estimatedAnnualReductionTCO2e ?? b.estimated_annual_reduction_t_co2e),
      estimated_annual_energy_savings: optionalFinite(b.estimatedAnnualEnergySavings ?? b.estimated_annual_energy_savings),
      energy_savings_unit: str(b.energySavingsUnit, b.energy_savings_unit) || null,
      estimated_capex: optionalFinite(b.estimatedCapex ?? b.estimated_capex),
      estimated_annual_cost_savings: optionalFinite(b.estimatedAnnualCostSavings ?? b.estimated_annual_cost_savings),
      simple_payback_years: optionalFinite(b.simplePaybackYears ?? b.simple_payback_years),
      calculation_metadata: b.calculationMetadata ?? b.calculation_metadata ?? {},
    };
    const { data, error } = await supabaseAdmin.from('reduction_opportunities').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create opportunity.' });
    res.status(201).json({ success: true, opportunity: mapOpportunity(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create opportunity.' }); }
});

app.patch('/api/opportunities/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const updates: any = { updated_at: new Date().toISOString() };
    for (const [front, db] of [['status', 'status'], ['title', 'title'], ['description', 'description'], ['rationale', 'rationale'], ['confidence', 'confidence']] as const) {
      if (b[front] !== undefined) updates[db] = str(b[front]);
    }
    const { data, error } = await supabaseAdmin
      .from('reduction_opportunities')
      .update(updates)
      .eq('id', req.params.id)
      .eq('organisation_id', p.organisation_id)
      .select('*')
      .single();
    if (error || !data) return res.status(404).json({ error: error?.message ?? 'Opportunity not found.' });
    res.json({ success: true, opportunity: mapOpportunity(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to update opportunity.' }); }
});

app.get('/api/scenarios', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    let query = supabaseAdmin.from('reduction_scenarios').select('*').eq('organisation_id', p.organisation_id);
    if (typeof req.query.facilityId === 'string') query = query.eq('facility_id', req.query.facilityId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ scenarios: (data ?? []).map(mapScenario) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load scenarios.' }); }
});

app.post('/api/scenarios', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const facilityId = str(b.facilityId, b.facility_id) || null;
    await ensureFacility(p.organisation_id, facilityId);
    const baselineStartDate = str(b.baselineStartDate, b.baseline_start_date);
    const baselineEndDate = str(b.baselineEndDate, b.baseline_end_date);
    const scenarioType = str(b.scenarioType, b.scenario_type) as ScenarioType;
    if (!baselineStartDate || !baselineEndDate || !scenarioType) return res.status(400).json({ error: 'Baseline dates and scenario type are required.' });
    const inputs = await loadIntelligenceInputs(p.organisation_id, facilityId, baselineStartDate, baselineEndDate);
    const result = calculateReductionScenario({
      scenarioType,
      activityRecords: inputs.activityRecords,
      productionRecords: inputs.productionRecords,
      baselineStartDate,
      baselineEndDate,
      assumptions: b.assumptions ?? {},
    });
    const row = {
      id: `scn-${randomUUID()}`,
      organisation_id: p.organisation_id,
      facility_id: facilityId,
      title: str(b.title) || scenarioType,
      baseline_start_date: baselineStartDate,
      baseline_end_date: baselineEndDate,
      scenario_type: scenarioType,
      assumptions: b.assumptions ?? {},
      baseline_emissions_t_co2e: result.baselineEmissionsTCO2e,
      scenario_emissions_t_co2e: result.scenarioEmissionsTCO2e,
      estimated_reduction_t_co2e: result.estimatedReductionTCO2e,
      estimated_reduction_percent: result.estimatedReductionPercent,
      calculation_metadata: result.calculationMetadata,
    };
    const { data, error } = await supabaseAdmin.from('reduction_scenarios').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to save scenario.' });
    res.status(201).json({ success: true, scenario: mapScenario(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create scenario.' }); }
});

app.get('/api/projects', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id);
    let query = supabaseAdmin
      .from('decarbonization_projects')
      .select('*, project_milestones(*), project_measurements(*)')
      .eq('organisation_id', p.organisation_id);
    if (typeof req.query.status === 'string') query = query.eq('status', req.query.status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ projects: (data ?? []).map(mapProject) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load projects.' }); }
});

app.post('/api/projects', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const facilityId = str(b.facilityId, b.facility_id) || null;
    await ensureFacility(p.organisation_id, facilityId);
    const opportunityId = str(b.opportunityId, b.opportunity_id) || null;
    const scenarioId = str(b.scenarioId, b.scenario_id) || null;
    if (opportunityId) {
      const { data } = await supabaseAdmin.from('reduction_opportunities').select('id').eq('id', opportunityId).eq('organisation_id', p.organisation_id).single();
      if (!data) return res.status(404).json({ error: 'Opportunity not found.' });
    }
    if (scenarioId) {
      const { data } = await supabaseAdmin.from('reduction_scenarios').select('id').eq('id', scenarioId).eq('organisation_id', p.organisation_id).single();
      if (!data) return res.status(404).json({ error: 'Scenario not found.' });
    }
    const title = str(b.title);
    if (!title) return res.status(400).json({ error: 'Project title is required.' });
    const row = {
      id: `proj-${randomUUID()}`,
      organisation_id: p.organisation_id,
      facility_id: facilityId,
      opportunity_id: opportunityId,
      scenario_id: scenarioId,
      title,
      description: str(b.description) || 'Decarbonization project created from Phase 2 workflow.',
      category: str(b.category) || 'Operational optimization',
      status: str(b.status) || 'planned',
      owner: str(b.owner) || null,
      baseline_start_date: str(b.baselineStartDate, b.baseline_start_date) || null,
      baseline_end_date: str(b.baselineEndDate, b.baseline_end_date) || null,
      planned_start_date: str(b.plannedStartDate, b.planned_start_date) || null,
      planned_completion_date: str(b.plannedCompletionDate, b.planned_completion_date) || null,
      target_annual_reduction_t_co2e: optionalFinite(b.targetAnnualReductionTCO2e ?? b.target_annual_reduction_t_co2e),
      estimated_capex: optionalFinite(b.estimatedCapex ?? b.estimated_capex),
      estimated_annual_cost_savings: optionalFinite(b.estimatedAnnualCostSavings ?? b.estimated_annual_cost_savings),
    };
    const { data, error } = await supabaseAdmin.from('decarbonization_projects').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create project.' });
    if (opportunityId) {
      await supabaseAdmin.from('reduction_opportunities').update({ status: 'converted-to-project', updated_at: new Date().toISOString() }).eq('id', opportunityId).eq('organisation_id', p.organisation_id);
    }
    res.status(201).json({ success: true, project: mapProject(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create project.' }); }
});

app.post('/api/projects/:id/milestones', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const { data: project } = await supabaseAdmin.from('decarbonization_projects').select('id').eq('id', req.params.id).eq('organisation_id', p.organisation_id).single();
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    const title = str(b.title);
    if (!title) return res.status(400).json({ error: 'Milestone title is required.' });
    const row = { id: `mile-${randomUUID()}`, project_id: req.params.id, title, description: str(b.description), due_date: str(b.dueDate, b.due_date) || null, status: str(b.status) || 'pending' };
    const { data, error } = await supabaseAdmin.from('project_milestones').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create milestone.' });
    res.status(201).json({ success: true, milestone: mapMilestone(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create milestone.' }); }
});

app.post('/api/projects/:id/measurements', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const { data: project } = await supabaseAdmin.from('decarbonization_projects').select('id').eq('id', req.params.id).eq('organisation_id', p.organisation_id).single();
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    const expectedReductionPercent = requiredFinite(b.expectedReductionPercent ?? b.expected_reduction_percent, 'Expected reduction');
    const baselineIntensity = requiredFinite(b.baselineIntensity ?? b.baseline_intensity, 'Baseline intensity');
    const observedIntensity = requiredFinite(b.observedIntensity ?? b.observed_intensity, 'Observed intensity');
    const comparison = calculateExpectedVsObserved({ expectedReductionPercent, baselineIntensity, observedIntensity });
    const row = {
      id: `meas-${randomUUID()}`,
      project_id: req.params.id,
      measurement_start_date: str(b.measurementStartDate, b.measurement_start_date),
      measurement_end_date: str(b.measurementEndDate, b.measurement_end_date),
      expected_reduction_percent: comparison.expectedReductionPercent,
      baseline_intensity: baselineIntensity,
      observed_intensity: observedIntensity,
      observed_improvement_percent: comparison.observedImprovementPercent,
      variance_percentage_points: comparison.variancePercentagePoints,
      methodology: comparison.wording,
      calculation_metadata: comparison,
    };
    if (!row.measurement_start_date || !row.measurement_end_date) return res.status(400).json({ error: 'Measurement period is required.' });
    const { data, error } = await supabaseAdmin.from('project_measurements').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create measurement.' });
    res.status(201).json({ success: true, measurement: mapMeasurement(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create measurement.' }); }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.', path: req.originalUrl }));

async function configureFrontend() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
    return;
  }

  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

async function startLocalServer() {
  await configureFrontend();
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error); res.status(500).json({ error: 'Internal server error.' });
  });
  app.listen(Number(process.env.PORT || 3000), () => console.log('Balancing Carbon API running.'));
}

if (!process.env.VERCEL) {
  startLocalServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
export default app;
