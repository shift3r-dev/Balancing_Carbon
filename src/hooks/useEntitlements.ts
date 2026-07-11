import { useCallback, useEffect, useState } from 'react';
import { safeFetchJson } from '../services/apiClient.ts';

export function useEntitlements() {
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [limits, setLimits] = useState<any[]>([]);
  const [license, setLicense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { setLoading(true); const [entitlementData, limitData, licenseData] = await Promise.all([safeFetchJson('/api/organization/entitlements', undefined, { entitlements: [] }), safeFetchJson('/api/organization/limits', undefined, { limits: [] }), safeFetchJson('/api/license', undefined, { license: null })]); setEntitlements(entitlementData?.entitlements ?? []); setLimits(limitData?.limits ?? []); setLicense(licenseData?.license ?? null); setLoading(false); }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { entitlements, limits, license, loading, refresh };
}

export const useEntitlement = (key: string) => { const { entitlements, loading } = useEntitlements(); return { enabled: Boolean(entitlements.find((item) => item.key === key)?.enabled), loading }; };
export const useLimit = (key: string) => { const { limits, loading } = useEntitlements(); return { limit: limits.find((item) => item.key === key) ?? null, loading }; };
export const useUsage = () => { const { limits, loading } = useEntitlements(); return { usage: limits.map(({ key, current, maximum, remaining, percentageUsed }) => ({ key, current, maximum, remaining, percentageUsed })), loading }; };
export const useLicense = () => { const { license, loading } = useEntitlements(); return { license, readOnly: Boolean(license?.read_only || ['expired', 'suspended', 'read-only'].includes(license?.status)), loading }; };
