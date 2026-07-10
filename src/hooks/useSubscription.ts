import { useCallback, useEffect, useState } from 'react';
import { safeFetchJson } from '../services/apiClient.ts';

export function useSubscription() {
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { setLoading(true); const [sub, nextUsage] = await Promise.all([safeFetchJson('/api/subscription', undefined, null), safeFetchJson('/api/subscription/usage', undefined, null)]); setSubscription(sub?.subscription ?? null); setUsage(nextUsage?.usage ?? null); setLoading(false); }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { subscription, usage, loading, refresh };
}
export const useCurrentPlan = () => useSubscription().subscription?.plan ?? null;
export const usePlanLimits = () => useCurrentPlan()?.limits ?? [];
export const usePlanFeatures = () => useCurrentPlan()?.features ?? [];
export const useTrial = () => { const subscription = useSubscription().subscription; return { active: subscription?.status === 'trial', endsAt: subscription?.trialEndsAt ?? null }; };
export const useUsage = () => useSubscription().usage;
