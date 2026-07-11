import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { calculateActivityEmissions, deriveActivityType } from '../carbonAccounting.js';
import { resolveRegistryFactor, saveCalculationLineage } from '../carbonLedgerService.js';
import { refreshFacilityAggregates } from '../facilityAggregates.js';
import { str } from '../requestUtils.js';
import { mapEnergyRecord } from '../rowMappers.js';
import { supabaseAdmin } from '../supabaseClients.js';
import { requireOperationalLicense } from '../middleware/entitlements.js';

function calculationMetadata(sourceType: string, calculation: ReturnType<typeof calculateActivityEmissions>, scope: string) {
  return {
    methodology: 'activity_data_x_emission_factor',
    quantity: calculation.quantity,
    activityUnit: calculation.normalizedUnit,
    sourceType,
    scope,
    emissionFactorId: calculation.emissionFactorId,
    emissionFactorValue: calculation.emissionFactorValue,
    emissionFactorUnit: calculation.emissionFactorUnit,
    emissionsKgCO2e: calculation.emissionsKgCO2e,
    emissionsTCO2e: calculation.emissionsTCO2e,
    factorSource: calculation.factorSource,
    factorVersion: calculation.factorVersion,
    calculatedAt: calculation.calculatedAt,
  };
}

export function createEnergyRouter() {
  const router = Router();

  router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      let query = supabaseAdmin.from('energy_records').select('*').eq('organisation_id', p.organisation_id);
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

  router.post('/', requireAuth, requireOperationalLicense, requirePermission('activity.create'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const facilityId = str(b.facilityId, b.facility_id);
      const sourceType = str(b.sourceType, b.source_type) || str(b.energyType, b.energy_type);
      const quantity = Number(b.quantity);
      const sourceDocument = str(b.sourceDocument, b.source_document);
      if (!facilityId || !sourceType || !Number.isFinite(quantity) || quantity < 0) {
        return res.status(400).json({ error: 'Facility, source type, and non-negative finite quantity are required.' });
      }
      if (!sourceDocument) return res.status(400).json({ error: 'An evidence reference is required for an auditable activity record.' });
      const { data: facility, error: facilityError } = await supabaseAdmin.from('facilities').select('*').eq('id', facilityId).eq('organisation_id', p.organisation_id).single();
      if (facilityError || !facility) return res.status(404).json({ error: 'Facility not found.' });

      const activityDate = str(b.date) || new Date().toISOString().split('T')[0];
      const factor = await resolveRegistryFactor(sourceType, facility.country || 'India', activityDate);
      if (!factor) return res.status(400).json({ error: `No active emission factor found for source type: ${sourceType}.` });
      const activityType = str(b.activityType, b.activity_type) || deriveActivityType(sourceType);
      let calculation;
      try {
        calculation = calculateActivityEmissions({ quantity, activityUnit: str(b.unit) || factor.activityUnit, sourceType, emissionFactor: factor });
      } catch (error) {
        return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid activity record.' });
      }
      const metadata = calculationMetadata(sourceType, calculation, factor.scope);
      const row = {
        id: `rec-${randomUUID()}`, organisation_id: p.organisation_id, facility_id: facilityId,
        date: activityDate,
        reporting_period: str(b.reportingPeriod, b.reporting_period) || facility.reporting_period || new Date().getFullYear().toString(),
        activity_type: activityType, source_type: sourceType, energy_type: sourceType, quantity,
        unit: calculation.normalizedUnit, scope: factor.scope,
        emission_factor_id: calculation.emissionFactorId, emission_factor_value: calculation.emissionFactorValue,
        emission_factor_unit: calculation.emissionFactorUnit, emissions_kg_co2e: calculation.emissionsKgCO2e,
        emissions_t_co2e: calculation.emissionsTCO2e, source_document: sourceDocument,
        notes: str(b.notes), emissions: calculation.emissionsTCO2e, audit_trail: metadata, calculation_metadata: metadata,
      };
      const { data, error } = await supabaseAdmin.from('energy_records').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create energy record.' });
      const lineage = await saveCalculationLineage({
        organisationId: p.organisation_id, userId: req.authUser!.id, legacyEnergyRecordId: data.id, facilityId, sourceType,
        activityDate, reportingPeriod: row.reporting_period, quantity, unit: row.unit, supplier: str(b.supplier), invoiceNumber: str(b.invoiceNumber, b.invoice_number),
        cost: b.cost === undefined || b.cost === '' ? null : Number(b.cost), currency: str(b.currency) || 'INR', sourceDocument: row.source_document,
        notes: row.notes, factor, calculation, documentIds: Array.isArray(b.documentIds) ? b.documentIds : b.documentId ? [b.documentId] : [],
      });
      await refreshFacilityAggregates(p.organisation_id, facilityId);
      res.status(201).json({ success: true, record: mapEnergyRecord(data), activity: lineage.activity, calculationRecord: lineage.calculationRecord });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create energy record.' }); }
  });

  router.patch('/:id', requireAuth, requireOperationalLicense, requirePermission('activity.edit'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const { data: existing, error: existingError } = await supabaseAdmin.from('energy_records').select('*').eq('id', req.params.id).eq('organisation_id', p.organisation_id).single();
      if (existingError || !existing) return res.status(404).json({ error: 'Energy record not found.' });
      const sourceType = str(b.sourceType, b.source_type) || str(b.energyType, b.energy_type) || existing.source_type || existing.energy_type;
      const quantity = b.quantity !== undefined ? Number(b.quantity) : Number(existing.quantity ?? 0);
      const factor = await resolveRegistryFactor(sourceType, existing.country || 'India', str(b.date) || existing.date);
      if (!factor) return res.status(400).json({ error: `No active emission factor found for source type: ${sourceType}.` });
      let calculation;
      try {
        calculation = calculateActivityEmissions({ quantity, activityUnit: str(b.unit) || existing.unit || factor.activityUnit, sourceType, emissionFactor: factor });
      } catch (error) {
        return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid activity record.' });
      }
      const metadata = calculationMetadata(sourceType, calculation, factor.scope);
      const updates = {
        date: str(b.date) || existing.date, reporting_period: str(b.reportingPeriod, b.reporting_period) || existing.reporting_period,
        activity_type: str(b.activityType, b.activity_type) || deriveActivityType(sourceType), source_type: sourceType, energy_type: sourceType,
        quantity, unit: calculation.normalizedUnit, scope: factor.scope, emission_factor_id: calculation.emissionFactorId,
        emission_factor_value: calculation.emissionFactorValue, emission_factor_unit: calculation.emissionFactorUnit,
        emissions_kg_co2e: calculation.emissionsKgCO2e, emissions_t_co2e: calculation.emissionsTCO2e,
        source_document: str(b.sourceDocument, b.source_document) || existing.source_document,
        notes: b.notes !== undefined ? str(b.notes) : existing.notes, emissions: calculation.emissionsTCO2e,
        audit_trail: metadata, calculation_metadata: metadata,
      };
      const { data, error } = await supabaseAdmin.from('energy_records').update(updates).eq('id', req.params.id).eq('organisation_id', p.organisation_id).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to update energy record.' });
      const { data: previousActivity } = await supabaseAdmin.from('activity_records').select('id, version_number').eq('legacy_energy_record_id', existing.id).eq('organisation_id', p.organisation_id).is('deleted_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const lineage = await saveCalculationLineage({
        organisationId: p.organisation_id, userId: req.authUser!.id, legacyEnergyRecordId: data.id, facilityId: existing.facility_id, sourceType,
        activityDate: updates.date, reportingPeriod: updates.reporting_period, quantity, unit: updates.unit, supplier: str(b.supplier), invoiceNumber: str(b.invoiceNumber, b.invoice_number),
        cost: b.cost === undefined || b.cost === '' ? null : Number(b.cost), currency: str(b.currency) || 'INR', sourceDocument: updates.source_document,
        notes: updates.notes, factor, calculation, documentIds: Array.isArray(b.documentIds) ? b.documentIds : b.documentId ? [b.documentId] : [], supersedesActivityId: previousActivity?.id ?? null, versionNumber: Number(previousActivity?.version_number ?? 0) + 1,
      });
      await refreshFacilityAggregates(p.organisation_id, existing.facility_id);
      res.json({ success: true, record: mapEnergyRecord(data), activity: lineage.activity, calculationRecord: lineage.calculationRecord });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to update energy record.' }); }
  });

  router.delete('/:id', requireAuth, requireOperationalLicense, requirePermission('activity.delete'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const { data: existing, error: existingError } = await supabaseAdmin.from('energy_records').select('id, facility_id').eq('id', req.params.id).eq('organisation_id', p.organisation_id).single();
      if (existingError || !existing) return res.status(404).json({ error: 'Energy record not found.' });
      const { error } = await supabaseAdmin.from('energy_records').delete().eq('id', req.params.id).eq('organisation_id', p.organisation_id);
      if (error) return res.status(500).json({ error: error.message });
      await supabaseAdmin.from('activity_records').update({ deleted_at: new Date().toISOString(), updated_by: req.authUser!.id }).eq('legacy_energy_record_id', existing.id).eq('organisation_id', p.organisation_id).is('deleted_at', null);
      await supabaseAdmin.from('calculation_records').update({ status: 'invalidated' }).eq('legacy_energy_record_id', existing.id).eq('organisation_id', p.organisation_id).eq('status', 'current');
      await refreshFacilityAggregates(p.organisation_id, existing.facility_id);
      res.json({ success: true, deletedRecordId: req.params.id });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to delete energy record.' }); }
  });

  return router;
}

export function createEmissionFactorRouter() {
  const router = Router();
  router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
    const country = typeof req.query.country === 'string' ? req.query.country : 'India';
    const { data, error } = await supabaseAdmin.from('emission_factor_registry').select('*').eq('status', 'active').eq('country', country).is('deleted_at', null).order('source_type');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ factors: data ?? [] });
  });
  return router;
}
