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
    const scope1 = num(b.emissionsScope1, b.emissions_scope_1);
    const scope2 = num(b.emissionsScope2, b.emissions_scope_2);
    const intensity = num(b.carbonIntensity, b.carbon_intensity) || ((scope1 + scope2) / (productionOutput || 1));

    const row = {
      id: `fac-${randomUUID()}`, organisation_id: p.organisation_id, name, location,
      industry_type: industryType, production_output: productionOutput,
      production_unit: str(b.productionUnit, b.production_unit) || 'Tonnes',
      reporting_period: reportingPeriod, electricity_consumption: electricity,
      fuel_consumption: fuel, fuel_type: str(b.fuelType, b.fuel_type) || 'Diesel',
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
    const p = await getProfile(req.authUser!.id), b = req.body ?? {}, u: any = {};
    const mappings: [string, string, 's'|'n'][] = [
      ['name','name','s'], ['location','location','s'], ['industryType','industry_type','s'],
      ['productionOutput','production_output','n'], ['productionUnit','production_unit','s'],
      ['reportingPeriod','reporting_period','s'], ['electricityConsumption','electricity_consumption','n'],
      ['fuelConsumption','fuel_consumption','n'], ['fuelType','fuel_type','s'],
      ['renewableEnergyUsage','renewable_energy_usage','n'], ['emissionsScope1','emissions_scope_1','n'],
      ['emissionsScope2','emissions_scope_2','n'], ['carbonIntensity','carbon_intensity','n'],
      ['esgReadinessStatus','esg_readiness_status','s'],
    ];
    for (const [front, db, kind] of mappings) if (b[front] !== undefined) u[db] = kind === 'n' ? num(b[front]) : str(b[front]);
    if (!Object.keys(u).length) return res.status(400).json({ error: 'No valid facility fields provided.' });
    const { data, error } = await supabaseAdmin.from('facilities').update(u).eq('id', req.params.id).eq('organisation_id', p.organisation_id).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Update failed.' });
    res.json({ success: true, facility: mapFacility(data) });
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Update failed.' }); }
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

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.', path: req.originalUrl }));
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error); res.status(500).json({ error: 'Internal server error.' });
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(Number(process.env.PORT || 3000), () => console.log('Balancing Carbon API running.'));
}
export default app;
