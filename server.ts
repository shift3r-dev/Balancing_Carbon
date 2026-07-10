import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { createClient, type User } from '@supabase/supabase-js';

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
  energyType: r.energy_type,
  quantity: Number(r.quantity ?? 0),
  unit: r.unit ?? '',
  sourceDocument: r.source_document ?? '',
  notes: r.notes ?? '',
  emissions: Number(r.emissions ?? 0),
  auditTrail: r.audit_trail ?? {},
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

const FUEL_EMISSION_FACTORS: Record<string, number> = {
  Diesel: 2.68,
  Petrol: 2.31,
  LPG: 2.98,
  'Natural Gas': 2.02,
  'Furnace Oil': 3.15,
  Biomass: 0.05,
};

const GRID_ELECTRICITY_FACTOR = 0.82;

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

function calculateEnergyRecordEmissions(energyType: string, quantity: number) {
  const factor = energyType === 'Grid Electricity'
    ? GRID_ELECTRICITY_FACTOR
    : energyType === 'Renewable Electricity'
      ? 0
      : FUEL_EMISSION_FACTORS[energyType] ?? 0;
  const factorUnit = energyType.includes('Electricity') ? 'kgCO2e/kWh' :
    energyType === 'LPG' || energyType === 'Biomass' ? 'kgCO2e/kg' :
      energyType === 'Natural Gas' ? 'kgCO2e/m3' : 'kgCO2e/Litre';
  const factorSource = energyType.includes('Electricity')
    ? 'CEA India Grid Emission Factor v19'
    : 'IPCC 2006 Guidelines';
  const methodology = energyType.includes('Electricity')
    ? 'Scope 2 Location-Based Electricity Emissions'
    : 'Scope 1 Stationary/Mobile Combustion';

  return {
    emissions: Number(((quantity * factor) / 1000).toFixed(4)),
    auditTrail: {
      emissionFactor: factor,
      factorUnit,
      factorSource,
      methodology,
      calculatedAt: new Date().toISOString(),
    },
  };
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
    const { data, error } = await supabaseAdmin
      .from('energy_records')
      .select('*')
      .eq('organisation_id', p.organisation_id)
      .order('date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ records: (data ?? []).map(mapEnergyRecord) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load energy records.' }); }
});

app.post('/api/energy', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const p = await getProfile(req.authUser!.id), b = req.body ?? {};
    const facilityId = str(b.facilityId, b.facility_id);
    const energyType = str(b.energyType, b.energy_type);
    const quantity = num(b.quantity);
    if (!facilityId || !energyType || quantity <= 0) {
      return res.status(400).json({ error: 'Facility, energy type, and positive quantity are required.' });
    }

    const { data: facility, error: facilityError } = await supabaseAdmin
      .from('facilities')
      .select('*')
      .eq('id', facilityId)
      .eq('organisation_id', p.organisation_id)
      .single();
    if (facilityError || !facility) return res.status(404).json({ error: 'Facility not found.' });

    const calculation = calculateEnergyRecordEmissions(energyType, quantity);
    const row = {
      id: `rec-${randomUUID()}`,
      organisation_id: p.organisation_id,
      facility_id: facilityId,
      date: str(b.date) || new Date().toISOString().split('T')[0],
      reporting_period: str(b.reportingPeriod, b.reporting_period) || facility.reporting_period || new Date().getFullYear().toString(),
      energy_type: energyType,
      quantity,
      unit: str(b.unit) || (energyType.includes('Electricity') ? 'kWh' : 'Litres'),
      source_document: str(b.sourceDocument, b.source_document) || 'Manual Entry',
      notes: str(b.notes),
      emissions: calculation.emissions,
      audit_trail: calculation.auditTrail,
    };

    const { data, error } = await supabaseAdmin.from('energy_records').insert(row).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create energy record.' });

    const { data: records, error: recordsError } = await supabaseAdmin
      .from('energy_records')
      .select('*')
      .eq('organisation_id', p.organisation_id)
      .eq('facility_id', facilityId);
    if (!recordsError) {
      let electricity = 0, renewable = 0, scope1 = 0, scope2 = 0;
      for (const record of records ?? []) {
        const qty = Number(record.quantity ?? 0);
        const emissions = Number(record.emissions ?? 0);
        if (record.energy_type === 'Grid Electricity') {
          electricity += qty;
          scope2 += emissions;
        } else if (record.energy_type === 'Renewable Electricity') {
          electricity += qty;
          renewable += qty;
        } else {
          scope1 += emissions;
        }
      }
      const productionOutput = Number(facility.production_output ?? 0);
      const carbonIntensity = productionOutput > 0 ? (scope1 + scope2) / productionOutput : 0;
      await supabaseAdmin
        .from('facilities')
        .update({
          electricity_consumption: Number(electricity.toFixed(4)),
          renewable_energy_usage: Number(renewable.toFixed(4)),
          emissions_scope_1: Number(scope1.toFixed(4)),
          emissions_scope_2: Number(scope2.toFixed(4)),
          carbon_intensity: Number(carbonIntensity.toFixed(5)),
        })
        .eq('id', facilityId)
        .eq('organisation_id', p.organisation_id);
    }

    res.status(201).json({ success: true, record: mapEnergyRecord(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create energy record.' }); }
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

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.', path: req.originalUrl }));
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error); res.status(500).json({ error: 'Internal server error.' });
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(Number(process.env.PORT || 3000), () => console.log('Balancing Carbon API running.'));
}
export default app;
