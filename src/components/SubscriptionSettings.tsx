import { AlertCircle, CheckCircle2, CreditCard, RefreshCw } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription.ts';
import { safeFetchJson } from '../services/apiClient.ts';
import { useEffect, useState } from 'react';

const usageMap: Record<string, string> = { facilities: 'facilities', users: 'users', reports_month: 'reportsGenerated', storage_gb: 'storageGb', ai_requests_month: 'aiRequests' };

export default function SubscriptionSettings() {
  const { subscription, usage, loading, refresh } = useSubscription();
  const [plans, setPlans] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { void safeFetchJson('/api/plans', undefined, { plans: [] }).then((data) => setPlans(data?.plans ?? [])); }, []);
  const perform = async (url: string, body?: Record<string, unknown>) => { setBusy(true); setMessage(''); const result = await safeFetchJson(url, { method: 'POST', body: JSON.stringify(body ?? {}) }, null); setMessage(result?.error ?? (result ? 'Subscription updated. No payment was collected.' : 'Unable to update subscription.')); await refresh(); setBusy(false); };
  if (loading) return <div className="p-8 text-xs font-mono text-gray-400">Loading subscription...</div>;
  const plan = subscription?.plan;
  return <div className="space-y-6">
    <section className="bg-white border border-brand-border p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5"><div><p className="text-[10px] font-mono text-gray-400 uppercase">Current plan</p><h1 className="text-2xl font-black text-brand-charcoal mt-1">{plan?.name ?? 'No plan configured'}</h1><p className="text-xs text-gray-500 mt-2">Status: <span className="font-bold text-brand-forest">{subscription?.status ?? 'Unknown'}</span>{subscription?.renewalAt ? ` | Renewal: ${new Date(subscription.renewalAt).toLocaleDateString()}` : ''}</p></div><div className="flex gap-2"><button onClick={() => void perform('/api/subscription/renew')} disabled={busy} className="px-4 py-2 border border-brand-border text-xs font-bold rounded">Renew</button><button onClick={() => void perform('/api/subscription/cancel')} disabled={busy} className="px-4 py-2 bg-brand-charcoal text-white text-xs font-bold rounded">Cancel</button></div></section>
    {message && <div className="text-xs border border-brand-border bg-white p-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-brand-forest" />{message}</div>}
    <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{(plan?.limits ?? []).filter((limit: any) => usageMap[limit.key]).map((limit: any) => { const used = Number(usage?.[usageMap[limit.key]] ?? 0); const percent = limit.type === 'number' && limit.value > 0 ? Math.min(100, (used / limit.value) * 100) : 0; return <div key={limit.key} className="bg-white border border-brand-border p-4"><div className="flex justify-between text-xs"><span className="font-bold">{limit.key.replaceAll('_', ' ')}</span><span>{used} / {limit.displayValue}</span></div>{limit.type === 'number' ? <div className="h-1.5 mt-3 bg-brand-offwhite"><div className="h-full bg-brand-forest" style={{ width: `${percent}%` }} /></div> : <p className="text-[10px] text-gray-400 mt-3">{limit.displayValue} capacity. Enforcement begins in Phase 4.</p>}</div>; })}</section>
    <section className="bg-white border border-brand-border p-6"><div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-brand-forest" /><h2 className="font-black">Change plan</h2></div><p className="text-xs text-gray-500 mt-2">Changes update subscription records only. Billing is not connected.</p><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">{plans.map((item) => <button key={item.id} onClick={() => void perform('/api/subscription/upgrade', { planId: item.id })} disabled={busy || item.id === plan?.id} className="border border-brand-border p-4 text-left hover:border-brand-forest disabled:opacity-50"><div className="flex justify-between"><span className="font-bold text-sm">{item.name}</span>{item.recommended && <CheckCircle2 className="w-4 h-4 text-brand-forest" />}</div><span className="block text-[10px] text-gray-500 mt-2">{item.badge || 'Select plan'}</span></button>)}</div></section>
    <p className="text-[10px] font-mono text-gray-400 flex gap-2"><RefreshCw className="w-3 h-3" /> Limits and plan features are visible here but are not enforced yet.</p>
  </div>;
}
