import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { calculateActivityEmissions, deriveActivityType, prototypeEmissionFactors, resolveEmissionFactor } from '../carbonAccounting.js';
import { refreshFacilityAggregates } from '../facilityAggregates.js';
import { str } from '../requestUtils.js';
import { mapEnergyRecord } from '../rowMappers.js';
import { supabaseAdmin } from '../supabaseClients.js';

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

  router.post('/', requireAuth, requirePermission('activity.create'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const facilityId = str(b.facilityId, b.facility_id);
      const sourceType = str(b.sourceType, b.source_type) || str(b.energyType, b.energy_type);
      const quantity = Number(b.quantity);
      if (!facilityId || !sourceType || !Number.isFinite(quantity) || quantity < 0) {
        return res.status(400).json({ error: 'Facility, source type, and non-negative finite quantity are required.' });
      }
      const { data: facility, error: facilityError } = await supabaseAdmin.from('facilities').select('*').eq('id', facilityId).eq('organisation_id', p.organisation_id).single();
      if (facilityError || !facility) return res.status(404).json({ error: 'Facility not found.' });

      const factor = resolveEmissionFactor(sourceType);
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
        date: str(b.date) || new Date().toISOString().split('T')[0],
        reporting_period: str(b.reportingPeriod, b.reporting_period) || facility.reporting_period || new Date().getFullYear().toString(),
        activity_type: activityType, source_type: sourceType, energy_type: sourceType, quantity,
        unit: calculation.normalizedUnit, scope: factor.scope,
        emission_factor_id: calculation.emissionFactorId, emission_factor_value: calculation.emissionFactorValue,
        emission_factor_unit: calculation.emissionFactorUnit, emissions_kg_co2e: calculation.emissionsKgCO2e,
        emissions_t_co2e: calculation.emissionsTCO2e, source_document: str(b.sourceDocument, b.source_document) || 'Manual Entry',
        notes: str(b.notes), emissions: calculation.emissionsTCO2e, audit_trail: metadata, calculation_metadata: metadata,
      };
      const { data, error } = await supabaseAdmin.from('energy_records').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create energy record.' });
      await refreshFacilityAggregates(p.organisation_id, facilityId);
      res.status(201).json({ success: true, record: mapEnergyRecord(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create energy record.' }); }
  });

  router.patch('/:id', requireAuth, requirePermission('activity.edit'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const { data: existing, error: existingError } = await supabaseAdmin.from('energy_records').select('*').eq('id', req.params.id).eq('organisation_id', p.organisation_id).single();
      if (existingError || !existing) return res.status(404).json({ error: 'Energy record not found.' });
      const sourceType = str(b.sourceType, b.source_type) || str(b.energyType, b.energy_type) || existing.source_type || existing.energy_type;
      const quantity = b.quantity !== undefined ? Number(b.quantity) : Number(existing.quantity ?? 0);
      const factor = resolveEmissionFactor(sourceType);
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
      await refreshFacilityAggregates(p.organisation_id, existing.facility_id);
      res.json({ success: true, record: mapEnergyRecord(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to update energy record.' }); }
  });

  router.delete('/:id', requireAuth, requirePermission('activity.delete'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const { data: existing, error: existingError } = await supabaseAdmin.from('energy_records').select('id, facility_id').eq('id', req.params.id).eq('organisation_id', p.organisation_id).single();
      if (existingError || !existing) return res.status(404).json({ error: 'Energy record not found.' });
      const { error } = await supabaseAdmin.from('energy_records').delete().eq('id', req.params.id).eq('organisation_id', p.organisation_id);
      if (error) return res.status(500).json({ error: error.message });
      await refreshFacilityAggregates(p.organisation_id, existing.facility_id);
      res.json({ success: true, deletedRecordId: req.params.id });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to delete energy record.' }); }
  });

  return router;
}

export function createEmissionFactorRouter() {
  const router = Router();
  router.get('/', requireAuth, (_req, res) => res.json({ factors: prototypeEmissionFactors }));
  return router;
}
