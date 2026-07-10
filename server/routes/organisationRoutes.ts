import { Router } from 'express';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { num, str } from '../requestUtils.js';
import { mapOrganisation } from '../rowMappers.js';
import { supabaseAdmin } from '../supabaseClients.js';

export function createOrganisationRouter() {
  const router = Router();

  router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const { data, error } = await supabaseAdmin.from('organisations').select('*').eq('id', p.organisation_id).single();
      if (error || !data) return res.status(404).json({ error: 'Organisation not found.' });
      res.json(mapOrganisation(data));
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load organisation.' }); }
  });

  router.post('/', requireAuth, requirePermission('organization.manage'), async (req: AuthenticatedRequest, res) => {
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

  return router;
}
