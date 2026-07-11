import { LockKeyhole } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEntitlements } from '../hooks/useEntitlements.ts';

export default function EntitlementGate({ entitlement, title, children }: { entitlement: string; title: string; children: ReactNode }) {
  const { entitlements, license, loading } = useEntitlements();
  const enabled = Boolean(entitlements.find((item) => item.key === entitlement)?.enabled);
  const readOnly = Boolean(license?.read_only || ['expired', 'suspended', 'read-only'].includes(license?.status));

  if (loading) return <div className="bg-white border border-brand-border p-6 text-xs text-gray-400 font-mono">Checking workspace access...</div>;
  if (readOnly || !enabled) return <section className="max-w-2xl bg-white border border-brand-border p-8 text-center"><div className="mx-auto w-10 h-10 flex items-center justify-center bg-brand-sage/30 text-brand-forest rounded"><LockKeyhole className="w-5 h-5" /></div><h2 className="text-xl font-black text-brand-charcoal mt-4">{readOnly ? 'Workspace is read-only' : `${title} is not included in this plan`}</h2><p className="text-sm text-gray-500 mt-2">{readOnly ? 'Renew or reactivate the organisation license to make changes.' : 'This workspace stays visible so your team can plan the next step. Change plans in Subscription Settings to enable it.'}</p></section>;
  return <>{children}</>;
}
