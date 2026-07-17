import { Router } from 'express';
import { type AuthenticatedRequest, requireAuth, requirePermission } from '../auth.js';
import { changeSubscription, getPlans, getPricingCatalog, getSubscription, subscriptionUsage } from '../subscriptionService.js';

export function createSubscriptionRouter() {
  const router = Router();
  router.get('/plans', async (_req, res) => { try { res.json({ plans: await getPlans() }); } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load plans.' }); } });
  router.get('/pricing-catalog', async (_req, res) => { try { res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600'); res.json(await getPricingCatalog()); } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load pricing catalog.' }); } });
  router.get('/subscription', requireAuth, async (req: AuthenticatedRequest, res) => { try { res.json({ subscription: await getSubscription(req.authorization!.organisationId) }); } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load subscription.' }); } });
  router.get('/subscription/usage', requireAuth, async (req: AuthenticatedRequest, res) => { try { res.json({ usage: await subscriptionUsage(req.authorization!.organisationId) }); } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load usage.' }); } });
  router.get('/subscription/features', requireAuth, async (req: AuthenticatedRequest, res) => { try { const subscription = await getSubscription(req.authorization!.organisationId); res.json({ features: subscription?.plan?.features ?? [], limits: subscription?.plan?.limits ?? [] }); } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load plan details.' }); } });
  router.post('/subscription/upgrade', requireAuth, requirePermission('subscription.manage'), async (req: AuthenticatedRequest, res) => {
    const billingInterval = req.body?.billingInterval ?? req.body?.billing_interval;
    if (billingInterval !== undefined && billingInterval !== 'monthly' && billingInterval !== 'yearly') return res.status(400).json({ error: 'Billing interval must be monthly or yearly.' });
    try { res.json({ subscription: await changeSubscription({ organisationId: req.authorization!.organisationId, userId: req.authUser!.id, planId: req.body?.planId ?? req.body?.plan_id, billingInterval, action: 'upgrade' }) }); } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to change subscription.' }); }
  });
  router.post('/subscription/cancel', requireAuth, requirePermission('subscription.manage'), async (req: AuthenticatedRequest, res) => { try { res.json({ subscription: await changeSubscription({ organisationId: req.authorization!.organisationId, userId: req.authUser!.id, action: 'cancel' }) }); } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to cancel subscription.' }); } });
  router.post('/subscription/renew', requireAuth, requirePermission('subscription.manage'), async (req: AuthenticatedRequest, res) => { try { res.json({ subscription: await changeSubscription({ organisationId: req.authorization!.organisationId, userId: req.authUser!.id, action: 'renew' }) }); } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to renew subscription.' }); } });
  return router;
}
