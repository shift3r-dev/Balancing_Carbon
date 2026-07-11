import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { type AuthenticatedRequest, requireAuth, requirePermission } from '../auth.js';
import { clearMeasurementCache, convertMeasurement, getUnitRegistry, resolveUnit, smartDisplay, unitsForSource } from '../measurementService.js';
import { getOrganizationLocalization, localizationCatalog, updateOrganizationLocalization, updateUserLocalization } from '../localizationService.js';
import { supabaseAdmin } from '../supabaseClients.js';

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const statusValues = new Set(['draft', 'published', 'archived', 'deprecated']);

async function categoryByCode(code: string) {
  const { data, error } = await supabaseAdmin.from('reference_categories').select('*').eq('code', code).is('deleted_at', null).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function auditReference(valueId: string, action: string, beforeValue: any, afterValue: any, userId: string) {
  await supabaseAdmin.from('reference_audit_logs').insert({ id: `reference-audit-${randomUUID()}`, reference_value_id: valueId, action, before_value: beforeValue ?? {}, after_value: afterValue ?? {}, acted_by: userId });
}

export function createReferenceDataRouter() {
  const router = Router();

  // The public calculator uses registry metadata but does not write conversion history.
  router.get('/public/units', async (req, res) => {
    try {
      // Unit registry changes are applied through Supabase migrations. Do not keep a
      // stale in-memory result when an administrator has just applied one.
      clearMeasurementCache();
      res.json({ units: await getUnitRegistry(typeof req.query.category === 'string' ? req.query.category : undefined) });
    }
    catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load public units.' }); }
  });
  router.post('/public/units/convert', async (req, res) => {
    try { const body = req.body ?? {}; const value = Number(body.value); if (!Number.isFinite(value) || !text(body.fromUnit) || !text(body.toUnit)) return res.status(400).json({ error: 'value, fromUnit, and toUnit are required.' }); res.json(await convertMeasurement({ value, fromUnit: text(body.fromUnit), toUnit: text(body.toUnit), context: 'public-sandbox' })); }
    catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Conversion failed.' }); }
  });

  router.get('/localization', requireAuth, async (req: AuthenticatedRequest, res) => {
    try { res.json({ localization: await getOrganizationLocalization(req.authorization!.organisationId, req.authUser!.id), catalog: await localizationCatalog() }); }
    catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load localization.' }); }
  });
  router.put('/localization', requireAuth, requirePermission('organization.manage'), async (req: AuthenticatedRequest, res) => {
    try { res.json({ localization: await updateOrganizationLocalization(req.authorization!.organisationId, req.body ?? {}) }); }
    catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to update localization.' }); }
  });
  router.put('/localization/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    try { res.json({ localization: await updateUserLocalization(req.authorization!.organisationId, req.authUser!.id, req.body ?? {}) }); }
    catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to update user localization.' }); }
  });

  router.get('/units/categories', requireAuth, async (_req, res) => {
    const { data, error } = await supabaseAdmin.from('unit_categories').select('*').eq('status', 'active').is('deleted_at', null).order('sort_order');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ categories: data ?? [] });
  });
  router.get('/units/defaults', requireAuth, async (req: AuthenticatedRequest, res) => {
    try { const localization = await getOrganizationLocalization(req.authorization!.organisationId, req.authUser!.id); res.json({ measurementSystem: localization.measurementSystem, units: localization.units }); }
    catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load unit defaults.' }); }
  });
  router.get('/units/search', requireAuth, async (req, res) => {
    const query = text(req.query.q).toLowerCase(); const units = await getUnitRegistry();
    res.json({ units: units.filter((unit) => !query || `${unit.code} ${unit.name} ${unit.symbol}`.toLowerCase().includes(query)) });
  });
  router.get('/units/conversions', requireAuth, async (req, res) => {
    try { const value = Number(req.query.value); const fromUnit = text(req.query.from); const toUnit = text(req.query.to); if (!Number.isFinite(value) || !fromUnit || !toUnit) return res.status(400).json({ error: 'value, from, and to are required.' }); res.json(await convertMeasurement({ value, fromUnit, toUnit })); }
    catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Conversion failed.' }); }
  });
  router.get('/units/:id', requireAuth, async (req, res) => {
    const unit = await resolveUnit(req.params.id); if (!unit) return res.status(404).json({ error: 'Unit not found.' }); res.json({ unit });
  });
  router.get('/units', requireAuth, async (req, res) => {
    try { const units = typeof req.query.sourceType === 'string' ? await unitsForSource(req.query.sourceType) : await getUnitRegistry(typeof req.query.category === 'string' ? req.query.category : undefined); res.json({ units }); }
    catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to load units.' }); }
  });
  router.post('/units/convert', requireAuth, async (req: AuthenticatedRequest, res) => {
    try { const body = req.body ?? {}; const value = Number(body.value); if (!Number.isFinite(value) || !text(body.fromUnit) || !text(body.toUnit)) return res.status(400).json({ error: 'value, fromUnit, and toUnit are required.' }); res.json(await convertMeasurement({ value, fromUnit: text(body.fromUnit), toUnit: text(body.toUnit), organisationId: req.authorization!.organisationId, userId: req.authUser!.id, context: 'api', audit: true })); }
    catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Conversion failed.' }); }
  });
  router.post('/units/display', requireAuth, async (req, res) => {
    try { const body = req.body ?? {}; const value = Number(body.value); if (!Number.isFinite(value) || !text(body.unit)) return res.status(400).json({ error: 'value and unit are required.' }); res.json(await smartDisplay({ value, unit: text(body.unit), measurementSystem: text(body.measurementSystem) || 'metric', preferredUnit: text(body.preferredUnit) || undefined })); }
    catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Display conversion failed.' }); }
  });
  router.post('/units', requireAuth, requirePermission('reference.create'), async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body ?? {}; const categoryId = text(body.categoryId); const code = text(body.code); const name = text(body.name); const symbol = text(body.symbol); const id = `unit-${randomUUID()}`;
      if (!categoryId || !code || !name || !symbol) return res.status(400).json({ error: 'categoryId, code, name, and symbol are required.' });
      const { data: category } = await supabaseAdmin.from('unit_categories').select('id').eq('id', categoryId).eq('status', 'active').maybeSingle(); if (!category) return res.status(400).json({ error: 'A valid active unit category is required.' });
      const { data, error } = await supabaseAdmin.from('unit_registry').insert({ id, code, name, symbol, category_id: categoryId, measurement_system: ['metric', 'imperial', 'hybrid', 'universal'].includes(text(body.measurementSystem)) ? text(body.measurementSystem) : 'universal', canonical_unit_id: text(body.canonicalUnitId) || (body.isCanonical ? id : null), factor_to_canonical: body.factorToCanonical === undefined ? null : Number(body.factorToCanonical), offset_to_canonical: Number(body.offsetToCanonical ?? 0), conversion_formula: ['linear', 'affine', 'custom'].includes(text(body.conversionFormula)) ? text(body.conversionFormula) : 'linear', display_precision: Number(body.displayPrecision ?? 2), localization_labels: body.localizationLabels ?? {}, metadata: body.metadata ?? {}, status: 'active' }).select('*').single();
      if (error || !data) throw new Error(error?.message ?? 'Unable to create unit.'); clearMeasurementCache(); res.status(201).json({ unit: data });
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create unit.' }); }
  });
  router.patch('/units/:id', requireAuth, requirePermission('reference.edit'), async (req, res) => {
    try {
      const body = req.body ?? {}; const updates: any = {}; for (const [requestKey, column] of [['name', 'name'], ['symbol', 'symbol'], ['displayPrecision', 'display_precision'], ['localizationLabels', 'localization_labels'], ['metadata', 'metadata'], ['status', 'status']] as const) if (body[requestKey] !== undefined) updates[column] = requestKey === 'displayPrecision' ? Number(body[requestKey]) : body[requestKey];
      const { data, error } = await supabaseAdmin.from('unit_registry').update(updates).eq('id', req.params.id).is('deleted_at', null).select('*').maybeSingle(); if (error || !data) return res.status(404).json({ error: error?.message ?? 'Unit not found.' }); clearMeasurementCache(); res.json({ unit: data });
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to update unit.' }); }
  });
  router.delete('/units/:id', requireAuth, requirePermission('reference.archive'), async (req, res) => {
    const { data, error } = await supabaseAdmin.from('unit_registry').update({ status: 'archived', deleted_at: new Date().toISOString() }).eq('id', req.params.id).is('deleted_at', null).select('id').maybeSingle();
    if (error) return res.status(500).json({ error: error.message }); if (!data) return res.status(404).json({ error: 'Unit not found.' }); clearMeasurementCache(); res.json({ success: true });
  });

  router.get('/reference/categories', requireAuth, async (_req, res) => {
    const { data, error } = await supabaseAdmin.from('reference_categories').select('*').is('deleted_at', null).order('sort_order');
    if (error) return res.status(500).json({ error: error.message }); res.json({ categories: data ?? [] });
  });
  router.get('/reference/search', requireAuth, async (req, res) => {
    const query = text(req.query.q); let request = supabaseAdmin.from('reference_values').select('*, reference_categories(code,name)').is('deleted_at', null).limit(100);
    if (typeof req.query.category === 'string') { const category = await categoryByCode(req.query.category); if (!category) return res.json({ values: [] }); request = request.eq('category_id', category.id); }
    if (query) request = request.or(`name.ilike.%${query}%,code.ilike.%${query}%,display_name.ilike.%${query}%`);
    const { data, error } = await request.order('sort_order'); if (error) return res.status(500).json({ error: error.message }); res.json({ values: data ?? [] });
  });
  router.get('/reference/hierarchy', requireAuth, async (req, res) => {
    const category = text(req.query.category); const root = text(req.query.rootId); let request = supabaseAdmin.from('reference_values').select('*').is('deleted_at', null).order('sort_order');
    if (category) { const item = await categoryByCode(category); if (!item) return res.json({ values: [] }); request = request.eq('category_id', item.id); }
    if (root) request = request.eq('parent_id', root); const { data, error } = await request; if (error) return res.status(500).json({ error: error.message }); res.json({ values: data ?? [] });
  });
  router.get('/reference/value/:id', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin.from('reference_values').select('*, reference_categories(*), reference_translations(*)').eq('id', req.params.id).is('deleted_at', null).maybeSingle();
    if (error) return res.status(500).json({ error: error.message }); if (!data) return res.status(404).json({ error: 'Reference value not found.' }); res.json({ value: data });
  });
  router.get('/reference/:category', requireAuth, async (req, res) => {
    const category = await categoryByCode(req.params.category); if (!category) return res.status(404).json({ error: 'Reference category not found.' });
    const { data, error } = await supabaseAdmin.from('reference_values').select('*, reference_translations(*)').eq('category_id', category.id).is('deleted_at', null).order('sort_order');
    if (error) return res.status(500).json({ error: error.message }); res.json({ category, values: data ?? [] });
  });
  router.post('/reference', requireAuth, requirePermission('reference.create'), async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body ?? {}; const category = await categoryByCode(text(body.categoryCode)); if (!category) return res.status(400).json({ error: 'A valid categoryCode is required.' });
      const code = text(body.code); const name = text(body.name); if (!code || !name) return res.status(400).json({ error: 'code and name are required.' });
      const value = { id: `reference-${randomUUID()}`, category_id: category.id, code, name, description: text(body.description), display_name: text(body.displayName) || name, short_name: text(body.shortName), symbol: text(body.symbol), parent_id: text(body.parentId) || null, country_code: text(body.countryCode), region_code: text(body.regionCode), industry_code: text(body.industryCode), version: '1', status: statusValues.has(text(body.status)) ? text(body.status) : 'draft', sort_order: Number(body.sortOrder ?? 0), metadata: body.metadata ?? {}, created_by: req.authUser!.id, updated_by: req.authUser!.id };
      const { data, error } = await supabaseAdmin.from('reference_values').insert(value).select('*').single(); if (error || !data) throw new Error(error?.message ?? 'Unable to create reference value.');
      await supabaseAdmin.from('reference_versions').insert({ id: `reference-version-${randomUUID()}`, reference_value_id: data.id, version: '1', snapshot: data, change_summary: 'Initial version.', created_by: req.authUser!.id }); await auditReference(data.id, 'created', {}, data, req.authUser!.id); clearMeasurementCache(); res.status(201).json({ value: data });
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create reference value.' }); }
  });
  router.put('/reference/:id', requireAuth, requirePermission('reference.edit'), async (req: AuthenticatedRequest, res) => {
    try {
      const { data: existing, error: readError } = await supabaseAdmin.from('reference_values').select('*').eq('id', req.params.id).is('deleted_at', null).maybeSingle(); if (readError || !existing) return res.status(404).json({ error: 'Reference value not found.' });
      const body = req.body ?? {}; const updates = { name: text(body.name) || existing.name, description: body.description === undefined ? existing.description : text(body.description), display_name: body.displayName === undefined ? existing.display_name : text(body.displayName), short_name: body.shortName === undefined ? existing.short_name : text(body.shortName), symbol: body.symbol === undefined ? existing.symbol : text(body.symbol), status: statusValues.has(text(body.status)) ? text(body.status) : existing.status, sort_order: body.sortOrder === undefined ? existing.sort_order : Number(body.sortOrder), metadata: body.metadata ?? existing.metadata, updated_by: req.authUser!.id };
      const { data, error } = await supabaseAdmin.from('reference_values').update(updates).eq('id', existing.id).select('*').single(); if (error || !data) throw new Error(error?.message ?? 'Unable to update reference value.'); await auditReference(data.id, 'updated', existing, data, req.authUser!.id); clearMeasurementCache(); res.json({ value: data });
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to update reference value.' }); }
  });
  router.delete('/reference/:id', requireAuth, requirePermission('reference.archive'), async (req: AuthenticatedRequest, res) => {
    const { data, error } = await supabaseAdmin.from('reference_values').update({ status: 'archived', deleted_at: new Date().toISOString(), updated_by: req.authUser!.id }).eq('id', req.params.id).is('deleted_at', null).select('*').maybeSingle();
    if (error) return res.status(500).json({ error: error.message }); if (!data) return res.status(404).json({ error: 'Reference value not found.' }); await auditReference(data.id, 'archived', data, { ...data, status: 'archived' }, req.authUser!.id); clearMeasurementCache(); res.json({ success: true });
  });
  return router;
}
