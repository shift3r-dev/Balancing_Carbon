import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, requireAuth, requirePermission } from '../auth.js';
import { calculateActivityEmissions } from '../carbonAccounting.js';
import { registryFactorToEngineFactor } from '../carbonLedgerService.js';
import { str } from '../requestUtils.js';
import { supabaseAdmin } from '../supabaseClients.js';
import { requireOperationalLicense } from '../middleware/entitlements.js';

const allowedStatuses = new Set(['draft', 'submitted', 'pending-review', 'verified', 'approved', 'rejected']);

export function createCarbonAccountingRouter() {
  const router = Router();

  router.get('/carbon-activities', requireAuth, async (req: AuthenticatedRequest, res) => {
    let query = supabaseAdmin.from('activity_records').select('*, emission_factor_registry(*), activity_evidence_links(*), calculation_records(*)').eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null);
    if (typeof req.query.facilityId === 'string') query = query.eq('facility_id', req.query.facilityId);
    if (typeof req.query.status === 'string') query = query.eq('verification_status', req.query.status);
    const { data, error } = await query.order('activity_date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ activities: data ?? [] });
  });

  router.get('/carbon-activities/:id/lineage', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data: activity, error } = await supabaseAdmin.from('activity_records').select('*, emission_factor_registry(*), activity_evidence_links(*, documents(*)), calculation_records(*)').eq('id', req.params.id).eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null).single();
    if (error || !activity) return res.status(404).json({ error: 'Activity record not found.' });
    res.json({ activity, evidence: activity.activity_evidence_links ?? [], calculations: activity.calculation_records ?? [] });
  });

  router.patch('/carbon-activities/:id/status', requireAuth, requireOperationalLicense, requirePermission('activity.edit'), async (req: AuthenticatedRequest, res) => {
    const verificationStatus = str(req.body?.verificationStatus, req.body?.verification_status);
    if (!allowedStatuses.has(verificationStatus)) return res.status(400).json({ error: 'Unsupported verification status.' });
    const { data, error } = await supabaseAdmin.from('activity_records').update({ verification_status: verificationStatus, updated_by: req.authUser!.id }).eq('id', req.params.id).eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null).select('*').single();
    if (error || !data) return res.status(404).json({ error: error?.message ?? 'Activity record not found.' });
    res.json({ success: true, activity: data });
  });

  router.post('/carbon-activities/:id/recalculate', requireAuth, requireOperationalLicense, requirePermission('activity.edit'), async (req: AuthenticatedRequest, res) => {
    const { data: activity, error: activityError } = await supabaseAdmin.from('activity_records').select('*, emission_factor_registry(*)').eq('id', req.params.id).eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null).single();
    if (activityError || !activity?.emission_factor_registry) return res.status(404).json({ error: 'Activity record or its emission factor was not found.' });
    let calculation;
    try { calculation = calculateActivityEmissions({ quantity: activity.quantity, activityUnit: activity.unit, sourceType: activity.source_type, emissionFactor: registryFactorToEngineFactor(activity.emission_factor_registry) }); }
    catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to recalculate activity.' }); }
    await supabaseAdmin.from('calculation_records').update({ status: 'superseded' }).eq('activity_record_id', activity.id).eq('status', 'current');
    const { data, error } = await supabaseAdmin.from('calculation_records').insert({
      id: `calc-${randomUUID()}`, legacy_energy_record_id: activity.legacy_energy_record_id, activity_record_id: activity.id, organisation_id: activity.organisation_id,
      emission_factor_id: activity.emission_factor_id, factor_version: activity.emission_factor_registry.version, formula: 'activity quantity x emission factor',
      input_snapshot: { quantity: Number(activity.quantity), unit: activity.unit, sourceType: activity.source_type, recalculated: true }, evidence_snapshot: [],
      emissions_kg_co2e: calculation.emissionsKgCO2e, emissions_t_co2e: calculation.emissionsTCO2e, calculated_by: req.authUser!.id,
    }).select('*').single();
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Unable to persist recalculation.' });
    res.json({ success: true, calculation: data });
  });

  router.get('/carbon-data-quality', requireAuth, async (req: AuthenticatedRequest, res) => {
    const organisationId = req.authorization!.organisationId;
    const [{ data: activities, error: activityError }, { count: evidenceCount, error: evidenceError }] = await Promise.all([
      supabaseAdmin.from('activity_records').select('id, verification_status, activity_date').eq('organisation_id', organisationId).is('deleted_at', null),
      supabaseAdmin.from('activity_evidence_links').select('id, activity_records!inner(organisation_id)', { count: 'exact', head: true }).eq('activity_records.organisation_id', organisationId),
    ]);
    if (activityError || evidenceError) return res.status(500).json({ error: activityError?.message ?? evidenceError?.message });
    const records = activities ?? [];
    const byStatus: Record<string, number> = records.reduce((result: Record<string, number>, row: any) => ({ ...result, [row.verification_status]: (result[row.verification_status] ?? 0) + 1 }), {} as Record<string, number>);
    res.json({ totalActivities: records.length, evidenceLinkedActivities: evidenceCount ?? 0, verificationPercent: records.length ? Number((((byStatus.verified ?? 0) + (byStatus.approved ?? 0)) / records.length * 100).toFixed(1)) : 0, pendingReviews: (byStatus.submitted ?? 0) + (byStatus['pending-review'] ?? 0), rejectedRecords: byStatus.rejected ?? 0, byStatus });
  });

  router.get('/carbon-summary', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data, error } = await supabaseAdmin.from('calculation_records').select('emissions_t_co2e, calculated_at, activity_records!inner(source_type, scope, facility_id, activity_date, deleted_at)').eq('organisation_id', req.authorization!.organisationId).eq('status', 'current').is('activity_records.deleted_at', null);
    if (error) return res.status(500).json({ error: error.message });
    const rows = data ?? [];
    const total = rows.reduce((sum: number, row: any) => sum + Number(row.emissions_t_co2e ?? 0), 0);
    const byScope = rows.reduce((result: Record<string, number>, row: any) => { const key = row.activity_records.scope ?? 'unclassified'; result[key] = (result[key] ?? 0) + Number(row.emissions_t_co2e ?? 0); return result; }, {});
    const bySource = rows.reduce((result: Record<string, number>, row: any) => { const key = row.activity_records.source_type ?? 'Unclassified'; result[key] = (result[key] ?? 0) + Number(row.emissions_t_co2e ?? 0); return result; }, {});
    const byMonth = rows.reduce((result: Record<string, number>, row: any) => { const key = String(row.activity_records.activity_date).slice(0, 7); result[key] = (result[key] ?? 0) + Number(row.emissions_t_co2e ?? 0); return result; }, {});
    res.json({ totalEmissionsTCO2e: Number(total.toFixed(6)), byScope, bySource, byMonth, calculationCount: rows.length });
  });

  return router;
}
