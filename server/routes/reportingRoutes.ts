import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { str } from '../requestUtils.js';
import { mapDocument, mapReport } from '../rowMappers.js';
import { supabaseAdmin } from '../supabaseClients.js';
import { syncUsage } from '../entitlementService.js';
import { requireEntitlement, requireLimit, requireOperationalLicense } from '../middleware/entitlements.js';

async function monthlyReportUsage(organisationId: string) {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1); startOfMonth.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId).gte('created_at', startOfMonth.toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Document evidence and report endpoints. Mounted at /api to preserve public URLs. */
export function createReportingRouter() {
  const router = Router();

  router.get('/documents', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const { data, error } = await supabaseAdmin.from('documents').select('*').eq('organisation_id', p.organisation_id).order('upload_date', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      res.json({ documents: (data ?? []).map(mapDocument) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load documents.' }); }
  });

  router.post('/documents', requireAuth, requireOperationalLicense, requirePermission('document.upload'), requireEntitlement('documents.upload'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const name = str(b.name);
      if (!name) return res.status(400).json({ error: 'Document name is required.' });
      const row = {
        id: `doc-${randomUUID()}`, organisation_id: p.organisation_id, name, category: str(b.category) || 'Other',
        upload_date: str(b.uploadDate, b.upload_date) || new Date().toISOString().split('T')[0],
        facility_id: str(b.facilityId, b.facility_id) || null, period: str(b.period) || 'FY 2025-26', size: str(b.size) || 'Unknown',
        ai_status: str(b.aiStatus, b.ai_status) || 'Processed', evidence_usage: str(b.evidenceUsage, b.evidence_usage) || str(b.notes),
      };
      const { data, error } = await supabaseAdmin.from('documents').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create document.' });
      res.status(201).json({ success: true, document: mapDocument(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create document.' }); }
  });

  router.delete('/documents/:id', requireAuth, requireOperationalLicense, requirePermission('document.delete'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const { data, error } = await supabaseAdmin.from('documents').delete().eq('id', req.params.id).eq('organisation_id', p.organisation_id).select('id').maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'Document not found.' });
      res.json({ success: true, deletedDocumentId: req.params.id });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to delete document.' }); }
  });

  router.get('/reports', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const { data, error } = await supabaseAdmin.from('reports').select('*').eq('organisation_id', p.organisation_id).order('created_date', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      res.json({ reports: (data ?? []).map(mapReport) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load reports.' }); }
  });

  router.post('/reports', requireAuth, requireOperationalLicense, requirePermission('report.generate'), requireEntitlement('reports.generate'), requireLimit('reports_month', monthlyReportUsage), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const title = str(b.title);
      if (!title) return res.status(400).json({ error: 'Report title is required.' });
      const row = {
        id: `rep-${randomUUID()}`, organisation_id: p.organisation_id, title,
        type: str(b.type) || 'Executive Summary', period: str(b.period) || 'FY 2025-26',
        created_date: new Date().toISOString().split('T')[0], summary: str(b.summary), status: 'Generated', download_url: '#',
      };
      const { data, error } = await supabaseAdmin.from('reports').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create report.' });
      await syncUsage(p.organisation_id, 'reports_month', await monthlyReportUsage(p.organisation_id));
      res.status(201).json({ success: true, report: mapReport(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create report.' }); }
  });

  return router;
}
