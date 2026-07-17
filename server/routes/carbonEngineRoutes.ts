import { randomUUID } from 'node:crypto';
import { Router } from 'express';

import { carbonActivityCatalog, findCarbonSource, type CarbonCalculationMethod, type CarbonScope } from '../../shared/carbonActivityCatalog.js';
import { publicScope3ScreeningFactors } from '../../shared/publicScope3ScreeningFactors.js';
import { type AuthenticatedRequest, requireAuth, requirePermission } from '../auth.js';
import { calculateProfessionalEmissions } from '../carbonAccounting.js';
import { registryFactorToEngineFactor, saveCalculationLineage } from '../carbonLedgerService.js';
import { requireOperationalLicense } from '../middleware/entitlements.js';
import { str } from '../requestUtils.js';
import { supabaseAdmin } from '../supabaseClients.js';

const scopes = new Set<CarbonScope>(['scope-1', 'scope-2', 'scope-3']);
const methods = new Set<CarbonCalculationMethod>(['activity-factor', 'distance-factor', 'spend-factor', 'refrigerant-balance', 'fuel-efficiency', 'supplier-specific']);

function factorDto(row: any) {
  return {
    id: row.id,
    sourceType: row.source_type,
    scope: row.scope,
    factorValue: Number(row.factor_value),
    factorUnit: row.factor_unit,
    activityUnit: row.activity_unit,
    country: row.country,
    region: row.region,
    sourceName: row.source_name,
    sourceReference: row.reference_url,
    version: row.version,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    calculationMethod: row.calculation_method || 'activity-factor',
    sourceCatalogId: row.source_catalog_id || '',
    qualityRating: row.quality_rating || 'unrated',
    approvalStatus: row.approval_status || 'approved',
    isCustom: Boolean(row.is_custom),
  };
}

async function loadFactor(organisationId: string | null, factorId: string, scope: CarbonScope) {
  const { data, error } = await supabaseAdmin.from('emission_factor_registry').select('*').eq('id', factorId).eq('status', 'active').is('deleted_at', null).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The selected emission factor is missing or inactive.');
  if (data.scope !== scope) throw new Error('The selected emission factor does not belong to this emissions scope.');
  if (data.approval_status && !['approved', 'published'].includes(data.approval_status)) throw new Error('The selected emission factor has not been approved for calculation use.');
  if (organisationId === null && data.organisation_id) throw new Error('Custom organisation factors are not available in the public calculator.');
  if (organisationId && data.organisation_id && data.organisation_id !== organisationId) throw new Error('The selected custom emission factor belongs to another organization.');
  return data;
}

function professionalInput(body: any, factorRow: any, source: NonNullable<ReturnType<typeof findCarbonSource>>) {
  const method = (str(body.method) || source.defaultMethod) as CarbonCalculationMethod;
  if (!methods.has(method)) throw new Error('Unsupported calculation method.');
  return {
    quantity: body.quantity ?? 0,
    activityUnit: str(body.unit) || factorRow.activity_unit,
    sourceType: factorRow.source_type,
    emissionFactor: registryFactorToEngineFactor(factorRow),
    method,
    beginningInventory: body.beginningInventory,
    purchases: body.purchases,
    endingInventory: body.endingInventory,
    recoveredOrReturned: body.recoveredOrReturned,
    distance: body.distance,
    fuelEfficiency: body.fuelEfficiency,
  };
}

function normalizedSourceName(value: string) {
  return value.toLowerCase().replace(/^mobile\s+/, '').trim();
}

function applyScreeningAssurance(calculation: ReturnType<typeof calculateProfessionalEmissions>, factorRow: any) {
  if (factorRow.quality_rating !== 'screening' && factorRow.metadata?.screeningOnly !== true) return calculation;
  calculation.confidenceScore = Math.min(calculation.confidenceScore, 35);
  const warning = 'This is an illustrative Scope 3 screening estimate. Replace it with supplier-specific, physical or authoritative factor data before reporting.';
  if (!calculation.warnings.includes(warning)) calculation.warnings.unshift(warning);
  return calculation;
}

async function calculateRequest(organisationId: string | null, body: any) {
  const source = findCarbonSource(str(body.sourceId));
  if (!source) throw new Error('Select a valid GHG Protocol activity source.');
  const factorId = str(body.factorId);
  if (!factorId) throw new Error('Select a versioned emission factor.');
  const factorRow = await loadFactor(organisationId, factorId, source.scope);
  if (factorRow.source_catalog_id && factorRow.source_catalog_id !== source.id) throw new Error('The selected emission factor is not mapped to this activity source.');
  if (!factorRow.source_catalog_id && normalizedSourceName(factorRow.source_type) !== normalizedSourceName(source.name)) throw new Error('The selected emission factor is not compatible with this activity source.');
  const calculation = applyScreeningAssurance(calculateProfessionalEmissions(professionalInput(body, factorRow, source)), factorRow);
  return { source, factorRow, calculation };
}

async function calculatePublicRequest(body: any) {
  const factorId = str(body.factorId);
  const screeningFactor = publicScope3ScreeningFactors.find((factor) => factor.id === factorId);
  if (!screeningFactor) return calculateRequest(null, body);
  const source = findCarbonSource(str(body.sourceId));
  if (!source || source.scope !== 'scope-3' || screeningFactor.source_catalog_id !== source.id) throw new Error('Select the screening factor mapped to this Scope 3 category.');
  const calculation = applyScreeningAssurance(calculateProfessionalEmissions(professionalInput(body, screeningFactor, source)), screeningFactor);
  return { source, factorRow: screeningFactor, calculation };
}

export function createCarbonEngineRouter() {
  const router = Router();

  router.get('/public/carbon-engine/factors', async (req, res) => {
    let query = supabaseAdmin.from('emission_factor_registry').select('*').eq('status', 'active').is('deleted_at', null).is('organisation_id', null).in('approval_status', ['approved', 'published']);
    if (typeof req.query.scope === 'string' && scopes.has(req.query.scope as CarbonScope)) query = query.eq('scope', req.query.scope);
    const { data, error } = await query.order('source_type').order('effective_from', { ascending: false }).limit(250);
    if (error) return res.status(500).json({ error: error.message });
    const rows = data ?? [];
    const databaseSourceIds = new Set(rows.map((factor: any) => factor.source_catalog_id).filter(Boolean));
    const screeningRows = publicScope3ScreeningFactors.filter((factor) => (!req.query.scope || req.query.scope === factor.scope) && !databaseSourceIds.has(factor.source_catalog_id));
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json({ factors: [...rows, ...screeningRows].map(factorDto) });
  });

  router.post('/public/carbon-engine/calculate', async (req, res) => {
    try {
      const result = await calculatePublicRequest(req.body ?? {});
      res.json({ source: result.source, factor: factorDto(result.factorRow), calculation: result.calculation });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to calculate emissions.' });
    }
  });

  router.get('/carbon-engine/catalog', requireAuth, (req: AuthenticatedRequest, res) => {
    const scope = typeof req.query.scope === 'string' && scopes.has(req.query.scope as CarbonScope) ? req.query.scope : null;
    res.json({ sources: scope ? carbonActivityCatalog.filter((item) => item.scope === scope) : carbonActivityCatalog });
  });

  router.get('/carbon-engine/factors', requireAuth, async (req: AuthenticatedRequest, res) => {
    let query = supabaseAdmin.from('emission_factor_registry').select('*').eq('status', 'active').is('deleted_at', null);
    if (typeof req.query.scope === 'string' && scopes.has(req.query.scope as CarbonScope)) query = query.eq('scope', req.query.scope);
    if (typeof req.query.country === 'string' && req.query.country.trim()) query = query.eq('country', req.query.country.trim());
    if (typeof req.query.search === 'string' && req.query.search.trim()) query = query.ilike('source_type', `%${req.query.search.trim()}%`);
    const { data, error } = await query.order('source_type').order('effective_from', { ascending: false }).limit(500);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ factors: (data ?? []).map(factorDto) });
  });

  router.post('/carbon-engine/calculate', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await calculateRequest(req.authorization!.organisationId, req.body ?? {});
      res.json({ source: result.source, factor: factorDto(result.factorRow), calculation: result.calculation });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to calculate emissions.' });
    }
  });

  router.get('/carbon-engine/drafts', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data, error } = await supabaseAdmin.from('carbon_calculation_drafts').select('*').eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null).order('updated_at', { ascending: false }).limit(50);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ drafts: data ?? [] });
  });

  router.post('/carbon-engine/drafts', requireAuth, requireOperationalLicense, requirePermission('activity.create'), async (req: AuthenticatedRequest, res) => {
    const body = req.body ?? {};
    const source = findCarbonSource(str(body.sourceId));
    if (!source) return res.status(400).json({ error: 'Select a valid activity source before saving a draft.' });
    const row = {
      id: str(body.id) || `carbon-draft-${randomUUID()}`,
      organisation_id: req.authorization!.organisationId,
      facility_id: str(body.facilityId) || null,
      scope: source.scope,
      source_catalog_id: source.id,
      title: str(body.title) || `${source.name} draft`,
      draft_data: body,
      last_calculation: body.lastCalculation ?? {},
      created_by: req.authUser!.id,
      updated_by: req.authUser!.id,
    };
    const { data, error } = await supabaseAdmin.from('carbon_calculation_drafts').upsert(row, { onConflict: 'id' }).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Unable to save draft.' });
    res.status(201).json({ success: true, draft: data });
  });

  router.post('/carbon-engine/activities', requireAuth, requireOperationalLicense, requirePermission('activity.create'), async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body ?? {};
      const facilityId = str(body.facilityId);
      if (!facilityId) return res.status(400).json({ error: 'Select a registered facility.' });
      const evidenceReference = str(body.evidenceReference, body.sourceDocument);
      if (!evidenceReference) return res.status(400).json({ error: 'Add an evidence reference before submitting to the ledger.' });
      const { data: facility } = await supabaseAdmin.from('facilities').select('id, reporting_period').eq('id', facilityId).eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null).maybeSingle();
      if (!facility) return res.status(404).json({ error: 'Facility not found in your organization.' });
      const { source, factorRow, calculation } = await calculateRequest(req.authorization!.organisationId, body);
      const activityDate = str(body.activityDate) || new Date().toISOString().slice(0, 10);
      const submittedQuantity = calculation.normalizedQuantity;
      const lineage = await saveCalculationLineage({
        organisationId: req.authorization!.organisationId,
        userId: req.authUser!.id,
        facilityId,
        sourceType: factorRow.source_type,
        activityDate,
        reportingPeriod: str(body.reportingPeriod) || facility.reporting_period || activityDate.slice(0, 4),
        quantity: submittedQuantity,
        unit: calculation.normalizedUnit,
        inputQuantity: Number(body.quantity ?? 0),
        inputUnit: str(body.unit) || factorRow.activity_unit,
        sourceDocument: evidenceReference,
        supplier: str(body.supplier),
        invoiceNumber: str(body.invoiceNumber),
        notes: str(body.notes),
        factor: registryFactorToEngineFactor(factorRow),
        calculation,
        documentIds: Array.isArray(body.documentIds) ? body.documentIds : [],
        activityCategory: source.category,
        scopeCategory: source.category,
        ghgCategory: source.ghgCategory,
        calculationMethod: calculation.calculationMethod,
        activityMetadata: calculation.inputSnapshot,
        confidenceScore: calculation.confidenceScore,
        dataQualityScore: Number(body.dataQualityScore || calculation.confidenceScore),
        supplierId: str(body.supplierId) || null,
        assetId: str(body.assetId) || null,
        meterId: str(body.meterId) || null,
        formula: calculation.formula,
      });
      if (str(body.draftId)) await supabaseAdmin.from('carbon_calculation_drafts').update({ deleted_at: new Date().toISOString(), updated_by: req.authUser!.id }).eq('id', str(body.draftId)).eq('organisation_id', req.authorization!.organisationId);
      res.status(201).json({ success: true, activity: lineage.activity, calculationRecord: lineage.calculationRecord });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to submit activity.' });
    }
  });

  return router;
}
