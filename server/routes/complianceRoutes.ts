import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { num, str } from '../requestUtils.js';
import { mapESGQuestion, mapOEMQuestionnaire } from '../rowMappers.js';
import { supabaseAdmin } from '../supabaseClients.js';
import { requireEntitlement, requireOperationalLicense } from '../middleware/entitlements.js';

/** ESG and OEM compliance endpoints. Mounted at /api to preserve public URLs. */
export function createComplianceRouter() {
  const router = Router();

  router.get('/esg', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const { data, error } = await supabaseAdmin.from('esg_questions').select('*').eq('organisation_id', p.organisation_id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ questions: (data ?? []).map(mapESGQuestion) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load ESG questions.' }); }
  });

  router.put('/esg/:id', requireAuth, requireOperationalLicense, requirePermission('project.edit'), requireEntitlement('compliance.manage'), async (req: AuthenticatedRequest, res) => {
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
      const { data, error } = await supabaseAdmin.from('esg_questions').update(updates).eq('id', req.params.id).eq('organisation_id', p.organisation_id).select('*').single();
      if (error || !data) return res.status(404).json({ error: error?.message ?? 'ESG question not found.' });
      res.json(mapESGQuestion(data));
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to update ESG question.' }); }
  });

  router.get('/oem-surveys', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const { data, error } = await supabaseAdmin.from('oem_questionnaires').select('*').eq('organisation_id', p.organisation_id).order('due_date', { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      res.json({ surveys: (data ?? []).map(mapOEMQuestionnaire) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load OEM surveys.' }); }
  });

  router.post('/oem-surveys', requireAuth, requireOperationalLicense, requirePermission('project.create'), requireEntitlement('compliance.manage'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const title = str(b.title), oemName = str(b.oemName, b.oem_name), dueDate = str(b.dueDate, b.due_date);
      if (!title || !oemName || !dueDate) return res.status(400).json({ error: 'Title, OEM name, and due date are required.' });
      const row = {
        id: `oem-${randomUUID()}`, organisation_id: p.organisation_id, title, oem_name: oemName, due_date: dueDate, status: 'Not Started',
        questions: [{
          id: `oemq-${randomUUID()}`,
          question: 'Do you systematically assess the carbon footprint of your raw material shipments?',
          category: 'Scope 3 Supply Chain',
          suggestedAnswer: 'We are preparing supplier-level emissions collection and will update this answer after primary data is reviewed.',
          evidenceSource: 'Supplier Engagement Plan Draft', confidence: 'Medium', status: 'Draft',
        }],
      };
      const { data, error } = await supabaseAdmin.from('oem_questionnaires').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create OEM survey.' });
      res.status(201).json({ success: true, survey: mapOEMQuestionnaire(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create OEM survey.' }); }
  });

  router.post('/oem-surveys/:id/approve-question', requireAuth, requireOperationalLicense, requirePermission('project.edit'), requireEntitlement('compliance.manage'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const questionId = str(b.questionId, b.question_id);
      if (!questionId) return res.status(400).json({ error: 'Question id is required.' });
      const { data: survey, error: surveyError } = await supabaseAdmin.from('oem_questionnaires').select('*').eq('id', req.params.id).eq('organisation_id', p.organisation_id).single();
      if (surveyError || !survey) return res.status(404).json({ error: 'OEM survey not found.' });
      let approved = 0;
      const questions = (survey.questions ?? []).map((q: any) => {
        const next = q.id === questionId ? { ...q, status: str(b.status) || 'Approved', ...(b.suggestedAnswer !== undefined ? { suggestedAnswer: str(b.suggestedAnswer) } : {}) } : q;
        if (next.status === 'Approved') approved += 1;
        return next;
      });
      const status = questions.length > 0 && approved === questions.length ? 'Completed' : 'In Progress';
      const { data, error } = await supabaseAdmin.from('oem_questionnaires').update({ questions, status }).eq('id', req.params.id).eq('organisation_id', p.organisation_id).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to update OEM question.' });
      res.json({ success: true, survey: mapOEMQuestionnaire(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to update OEM question.' }); }
  });

  return router;
}
