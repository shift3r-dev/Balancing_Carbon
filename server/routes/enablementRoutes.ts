import { Router } from 'express';
import { type AuthenticatedRequest, requireAuth } from '../auth.js';
import { str } from '../requestUtils.js';
import { supabaseAdmin } from '../supabaseClients.js';

const allowedItems = new Set([
  'welcome-dismissed','tour-platform','tour-data','tour-reporting','tour-auditor',
  'profile-reviewed','team-invited','first-dashboard-review','first-report-exported',
  'guide-carbon-basics','guide-data-import','guide-reporting','guide-audit',
]);

async function countRows(table: string, organisationId: string, configure?: (query: any) => any) {
  let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId);
  if (configure) query = configure(query);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function createEnablementRouter() {
  const router = Router();

  router.get('/enablement/summary', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const organisationId = req.authorization!.organisationId;
      const [organisationResult, facilities, activities, production, documents, reports, projects, members, progressResult] = await Promise.all([
        supabaseAdmin.from('organisations').select('name,industry,location,reporting_year').eq('id', organisationId).maybeSingle(),
        countRows('facilities', organisationId, (query) => query.is('deleted_at', null)),
        countRows('activity_records', organisationId, (query) => query.is('deleted_at', null).neq('activity_category', 'production')),
        countRows('production_records', organisationId), countRows('documents', organisationId),
        countRows('reports', organisationId, (query) => query.is('archived_at', null)), countRows('decarbonization_projects', organisationId),
        countRows('organization_members', organisationId, (query) => query.is('deleted_at', null)),
        supabaseAdmin.from('user_enablement_progress').select('*').eq('organisation_id', organisationId).eq('user_id', req.authUser!.id),
      ]);
      if (organisationResult.error) throw new Error(organisationResult.error.message);
      if (progressResult.error) throw new Error(progressResult.error.message);
      const organisation = organisationResult.data;
      res.json({
        signals: {
          organisationProfile: Boolean(organisation?.name && organisation?.industry && organisation?.location && organisation?.reporting_year),
          facilities, activities, production, documents, reports, projects, members,
        },
        progress: progressResult.data ?? [], roles: req.authorization!.roles, permissions: req.authorization!.permissions,
      });
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load enablement progress.' }); }
  });

  router.put('/enablement/progress/:key', requireAuth, async (req: AuthenticatedRequest, res) => {
    const itemKey = str(req.params.key), itemType = str(req.body?.itemType) || 'task', status = str(req.body?.status) || 'completed';
    if (!allowedItems.has(itemKey)) return res.status(400).json({ error: 'Unknown enablement item.' });
    if (!['task','tour','guide','preference'].includes(itemType) || !['started','completed','dismissed'].includes(status)) return res.status(400).json({ error: 'Invalid enablement progress state.' });
    const organisationId = req.authorization!.organisationId, now = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from('user_enablement_progress').upsert({
      id: `enablement-${req.authUser!.id}-${itemKey}`, organisation_id: organisationId, user_id: req.authUser!.id, item_key: itemKey, item_type: itemType, status,
      metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {}, completed_at: status === 'completed' ? now : null,
    }, { onConflict: 'organisation_id,user_id,item_key', ignoreDuplicates: false }).select('*').single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ progress: data });
  });

  return router;
}
