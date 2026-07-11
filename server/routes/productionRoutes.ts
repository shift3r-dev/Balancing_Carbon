import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { str } from '../requestUtils.js';
import { mapProductionRecord } from '../rowMappers.js';
import { supabaseAdmin } from '../supabaseClients.js';
import { requireOperationalLicense } from '../middleware/entitlements.js';

export function createProductionRouter() {
  const router = Router();

  router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      let query = supabaseAdmin.from('production_records').select('*').eq('organisation_id', p.organisation_id);
      if (typeof req.query.facilityId === 'string') query = query.eq('facility_id', req.query.facilityId);
      if (typeof req.query.reportingPeriod === 'string') query = query.eq('reporting_period', req.query.reportingPeriod);
      const { data, error } = await query.order('date', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      res.json({ records: (data ?? []).map(mapProductionRecord) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load production records.' }); }
  });

  router.post('/', requireAuth, requireOperationalLicense, requirePermission('activity.create'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const facilityId = str(b.facilityId, b.facility_id);
      const quantity = Number(b.quantity);
      const unit = str(b.unit);
      if (!facilityId || !Number.isFinite(quantity) || quantity < 0 || !unit) {
        return res.status(400).json({ error: 'Facility, non-negative finite quantity, and production unit are required.' });
      }
      const { data: facility, error: facilityError } = await supabaseAdmin.from('facilities').select('id').eq('id', facilityId).eq('organisation_id', p.organisation_id).single();
      if (facilityError || !facility) return res.status(404).json({ error: 'Facility not found.' });
      const row = {
        id: `prod-${randomUUID()}`, organisation_id: p.organisation_id, facility_id: facilityId,
        date: str(b.date) || new Date().toISOString().split('T')[0],
        reporting_period: str(b.reportingPeriod, b.reporting_period) || 'FY 2025-26',
        quantity, unit, source_document: str(b.sourceDocument, b.source_document), notes: str(b.notes),
      };
      const { data, error } = await supabaseAdmin.from('production_records').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create production record.' });
      const { data: activity, error: activityError } = await supabaseAdmin.from('activity_records').insert({
        id: `activity-production-${randomUUID()}`, organisation_id: p.organisation_id, facility_id: facilityId, activity_category: 'production', source_type: 'Production Output',
        activity_date: row.date, reporting_period: row.reporting_period, quantity, unit, source_document: row.source_document, notes: row.notes,
        verification_status: row.source_document ? 'submitted' : 'draft', created_by: req.authUser!.id, updated_by: req.authUser!.id,
      }).select('*').single();
      if (activityError) return res.status(500).json({ error: activityError.message });
      res.status(201).json({ success: true, record: mapProductionRecord(data), activity });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create production record.' }); }
  });

  return router;
}
