import { Router } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import multer from 'multer';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { str } from '../requestUtils.js';
import { mapDocument, mapReport } from '../rowMappers.js';
import { supabaseAdmin } from '../supabaseClients.js';
import { syncUsage } from '../entitlementService.js';
import { requireEntitlement, requireLimit, requireOperationalLicense } from '../middleware/entitlements.js';
import { chunkDocumentText, extractDocumentText, validateEvidenceFile } from '../documentExtraction.js';
import { runtimeConfig } from '../config/runtime.js';

const evidenceBucket = runtimeConfig.storage.bucket || 'evidence';
const allowedTypes = new Set(['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/csv','text/markdown','application/json']);
const uploadEvidence = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, callback) => callback(null, allowedTypes.has(file.mimetype)) });
const safeFilename = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-120) || 'evidence';

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

  router.post('/documents/upload', requireAuth, requireOperationalLicense, requirePermission('document.upload'), requireEntitlement('documents.upload'), uploadEvidence.single('file'), async (req: AuthenticatedRequest, res) => {
    const p = await getProfile(req.authUser!.id), file = req.file; if (!file) return res.status(400).json({ error: 'A supported evidence file is required.' });
    if (!validateEvidenceFile(file.buffer, file.mimetype)) return res.status(400).json({ error: 'File content does not match the declared evidence type.' });
    const facilityId = str(req.body?.facilityId) || null;
    if (facilityId) { const { data } = await supabaseAdmin.from('facilities').select('id').eq('id', facilityId).eq('organisation_id', p.organisation_id).maybeSingle(); if (!data) return res.status(400).json({ error: 'The selected facility does not belong to this organisation.' }); }
    const id = `doc-${randomUUID()}`, storagePath = `${p.organisation_id}/${id}/${safeFilename(file.originalname)}`, sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const { error: storageError } = await supabaseAdmin.storage.from(evidenceBucket).upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });
    if (storageError) return res.status(500).json({ error: `Evidence storage failed: ${storageError.message}` });
    const row = { id, organisation_id: p.organisation_id, name: file.originalname, category: str(req.body?.category) || 'Other', upload_date: new Date().toISOString().slice(0,10), facility_id: facilityId, period: str(req.body?.period) || 'FY 2025-26', size: `${(file.size / 1024 / 1024).toFixed(2)} MB`, ai_status: 'Processing', evidence_usage: str(req.body?.notes), storage_path: storagePath, mime_type: file.mimetype, byte_size: file.size, sha256, extraction_status: 'processing', extraction_error: '' };
    const { data: document, error: insertError } = await supabaseAdmin.from('documents').insert(row).select('*').single();
    if (insertError || !document) { await supabaseAdmin.storage.from(evidenceBucket).remove([storagePath]); return res.status(500).json({ error: insertError?.message ?? 'Unable to register evidence.' }); }
    try {
      const text = await extractDocumentText(file.buffer, file.mimetype), chunks = chunkDocumentText(text);
      if (chunks.length) { const { error } = await supabaseAdmin.from('document_text_chunks').insert(chunks.map((content, index) => ({ id: `document-chunk-${randomUUID()}`, organisation_id: p.organisation_id, document_id: id, chunk_index: index, content, character_count: content.length, token_estimate: Math.ceil(content.length / 4) }))); if (error) throw new Error(error.message); }
      const extractionStatus = chunks.length ? 'completed' : 'empty'; const { data: updated, error } = await supabaseAdmin.from('documents').update({ extraction_status: extractionStatus, extracted_at: new Date().toISOString(), ai_status: 'Processed' }).eq('id', id).eq('organisation_id', p.organisation_id).select('*').single(); if (error) throw new Error(error.message);
      return res.status(201).json({ success: true, document: mapDocument(updated), extraction: { status: extractionStatus, chunks: chunks.length } });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0,500) : 'Extraction failed.'; const { data: updated } = await supabaseAdmin.from('documents').update({ extraction_status: 'failed', extraction_error: message, extracted_at: new Date().toISOString(), ai_status: 'Failed' }).eq('id', id).eq('organisation_id', p.organisation_id).select('*').single();
      return res.status(201).json({ success: true, document: mapDocument(updated ?? document), extraction: { status: 'failed', error: message } });
    }
  });

  router.get('/documents/:id/download', requireAuth, async (req: AuthenticatedRequest, res) => {
    const p = await getProfile(req.authUser!.id); const { data, error } = await supabaseAdmin.from('documents').select('storage_path').eq('id', req.params.id).eq('organisation_id', p.organisation_id).maybeSingle();
    if (error || !data?.storage_path) return res.status(404).json({ error: 'Stored evidence file not found.' }); const signed = await supabaseAdmin.storage.from(evidenceBucket).createSignedUrl(data.storage_path, 60);
    if (signed.error) return res.status(500).json({ error: signed.error.message }); res.json({ url: signed.data.signedUrl, expiresIn: 60 });
  });

  router.delete('/documents/:id', requireAuth, requireOperationalLicense, requirePermission('document.delete'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const { data: existing } = await supabaseAdmin.from('documents').select('storage_path').eq('id', req.params.id).eq('organisation_id', p.organisation_id).maybeSingle();
      if (existing?.storage_path) { const removed = await supabaseAdmin.storage.from(evidenceBucket).remove([existing.storage_path]); if (removed.error) return res.status(500).json({ error: removed.error.message }); }
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
        created_date: new Date().toISOString().split('T')[0], summary: str(b.summary), status: 'Generated', download_url: '',
      };
      const { data, error } = await supabaseAdmin.from('reports').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create report.' });
      await syncUsage(p.organisation_id, 'reports_month', await monthlyReportUsage(p.organisation_id));
      res.status(201).json({ success: true, report: mapReport(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create report.' }); }
  });

  return router;
}
