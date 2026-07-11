import { Router } from 'express';
import { type AuthenticatedRequest, requireAuth, requirePermission } from '../auth.js';
import { getEntitlements, getLicense, getLimits } from '../entitlementService.js';
import { supabaseAdmin } from '../supabaseClients.js';

export function createEntitlementRouter() {
  const router = Router();
  router.get('/entitlements', requireAuth, async (_req, res) => { const { data, error } = await supabaseAdmin.from('entitlements').select('*').is('deleted_at', null); if (error) return res.status(500).json({ error: error.message }); res.json({ entitlements: data ?? [] }); });
  router.get('/organization/entitlements', requireAuth, async (req: AuthenticatedRequest, res) => { try { res.json({ entitlements: await getEntitlements(req.authorization!.organisationId) }); } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load entitlements.' }); } });
  router.get('/organization/limits', requireAuth, async (req: AuthenticatedRequest, res) => { try { res.json({ limits: await getLimits(req.authorization!.organisationId) }); } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load limits.' }); } });
  router.get('/organization/usage', requireAuth, async (req: AuthenticatedRequest, res) => { const { data, error } = await supabaseAdmin.from('organization_usage').select('*').eq('organisation_id', req.authorization!.organisationId); if (error) return res.status(500).json({ error: error.message }); res.json({ usage: data ?? [] }); });
  router.get('/license', requireAuth, async (req: AuthenticatedRequest, res) => { try { res.json({ license: await getLicense(req.authorization!.organisationId) }); } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load license.' }); } });
  router.post('/license/:action', requireAuth, requirePermission('subscription.manage'), async (req: AuthenticatedRequest, res) => {
    const action = req.params.action;
    if (!['suspend', 'reactivate', 'renew'].includes(action)) return res.status(400).json({ error: 'Unsupported license action.' });
    const status = action === 'suspend' ? 'suspended' : 'active';
    const { error } = await supabaseAdmin.from('license_assignments').update({ status, read_only: status === 'suspended', ...(action === 'renew' ? { expires_at: null } : {}) }).eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, status });
  });
  return router;
}
