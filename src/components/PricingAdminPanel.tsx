import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Save, SlidersHorizontal } from 'lucide-react';
import type { ImplementationService, PricingAddon, PricingPlan } from '../../shared/pricingCatalog.ts';
import { ensureFreshSession, getAuthenticatedHeaders } from '../services/apiClient.ts';

interface PricingCatalog { plans: PricingPlan[]; addons: PricingAddon[]; implementationServices: ImplementationService[] }

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  await ensureFreshSession();
  const response = await fetch(url, { ...options, headers: { ...getAuthenticatedHeaders(options?.headers), 'Content-Type': 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'The pricing request could not be completed.');
  return payload as T;
}

const fieldClass = 'h-10 px-3 bg-brand-offwhite border border-brand-border rounded text-xs outline-none focus:border-brand-forest';

export default function PricingAdminPanel() {
  const [catalog, setCatalog] = useState<PricingCatalog | null>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const load = useCallback(async () => {
    setBusy('loading');
    try { setCatalog(await requestJson<PricingCatalog>('/api/platform-admin/pricing')); }
    catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load pricing.' }); }
    finally { setBusy(''); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const updatePlan = (id: string, update: (value: PricingPlan) => PricingPlan) => setCatalog((current) => current ? { ...current, plans: current.plans.map((item) => item.id === id ? update(item) : item) } : current);
  const updateAddon = (id: string, update: (value: PricingAddon) => PricingAddon) => setCatalog((current) => current ? { ...current, addons: current.addons.map((item) => item.id === id ? update(item) : item) } : current);
  const updateService = (id: string, update: (value: ImplementationService) => ImplementationService) => setCatalog((current) => current ? { ...current, implementationServices: current.implementationServices.map((item) => item.id === id ? update(item) : item) } : current);
  const save = async (kind: 'plans' | 'addons' | 'implementation-services', id: string, body: unknown) => {
    setBusy(`${kind}-${id}`); setMessage(null);
    try { await requestJson(`/api/platform-admin/pricing/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); setMessage({ type: 'success', text: 'Pricing configuration saved and audited.' }); }
    catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save pricing.' }); }
    finally { setBusy(''); }
  };

  if (!catalog) return <div className="bg-white border border-brand-border rounded-lg p-8 text-sm text-gray-500 flex items-center gap-3"><RefreshCw className="w-4 h-4 animate-spin" />Loading pricing configuration...</div>;
  return <section className="space-y-6">
    <div className="bg-white border border-brand-border rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><p className="text-[10px] font-mono uppercase text-brand-forest">Commercial configuration</p><h3 className="font-black text-xl mt-1">Pricing and entitlement management</h3><p className="text-xs text-gray-500 mt-1">Saved changes update the public catalog and are added to the audit trail.</p></div><button type="button" onClick={() => void load()} className="btn-secondary"><RefreshCw className="w-4 h-4" />Reload</button></div>
    {message && <div role="status" className={`border rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-brand-sage/40 border-brand-sage text-brand-forest' : 'bg-red-50 border-red-200 text-red-700'}`}>{message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{message.text}</div>}
    <div className="space-y-4">{catalog.plans.map((plan) => <details key={plan.id} className="bg-white border border-brand-border rounded-lg overflow-hidden" open={plan.recommended}>
      <summary className="list-none cursor-pointer p-5 flex items-center justify-between gap-4 hover:bg-brand-offwhite"><div><span className="font-black">{plan.name}</span><span className="ml-3 text-[10px] font-mono text-gray-400">{plan.id}</span></div><div className="flex items-center gap-2"><span className={`text-[9px] font-mono uppercase px-2 py-1 rounded ${plan.visible ? 'bg-brand-sage text-brand-forest' : 'bg-gray-100 text-gray-500'}`}>{plan.visible ? 'Public' : 'Hidden'}</span><SlidersHorizontal className="w-4 h-4" /></div></summary>
      <div className="border-t border-brand-border p-5 space-y-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><label className="text-[10px] font-bold text-gray-500">Monthly price<input type="number" min="0" value={plan.monthlyPrice} onChange={(event) => updatePlan(plan.id, (item) => ({ ...item, monthlyPrice: Number(event.target.value) }))} className={`block w-full mt-1 ${fieldClass}`} /></label><label className="text-[10px] font-bold text-gray-500">Annual price<input type="number" min="0" value={plan.yearlyPrice} onChange={(event) => updatePlan(plan.id, (item) => ({ ...item, yearlyPrice: Number(event.target.value) }))} className={`block w-full mt-1 ${fieldClass}`} /></label><label className="text-[10px] font-bold text-gray-500">Badge<input value={plan.badge} onChange={(event) => updatePlan(plan.id, (item) => ({ ...item, badge: event.target.value }))} className={`block w-full mt-1 ${fieldClass}`} /></label><label className="text-[10px] font-bold text-gray-500">Promotion<input value={plan.promotion.label ?? ''} onChange={(event) => updatePlan(plan.id, (item) => ({ ...item, promotion: { ...item.promotion, label: event.target.value } }))} className={`block w-full mt-1 ${fieldClass}`} /></label></div>
        <div className="flex flex-wrap gap-5"><label className="text-xs font-bold flex items-center gap-2"><input type="checkbox" checked={plan.visible} onChange={(event) => updatePlan(plan.id, (item) => ({ ...item, visible: event.target.checked }))} />Visible</label><label className="text-xs font-bold flex items-center gap-2"><input type="checkbox" checked={plan.recommended} onChange={(event) => updatePlan(plan.id, (item) => ({ ...item, recommended: event.target.checked }))} />Recommended</label><label className="text-xs font-bold flex items-center gap-2"><input type="checkbox" checked={plan.contactSales} onChange={(event) => updatePlan(plan.id, (item) => ({ ...item, contactSales: event.target.checked }))} />Contact sales</label></div>
        <div><h4 className="text-xs font-black mb-2">Usage limits</h4><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">{plan.limits.map((limit) => <div key={limit.key} className="border border-brand-border rounded p-3"><p className="text-[10px] font-mono text-gray-400">{limit.key}</p><div className="grid grid-cols-[1fr_1.2fr] gap-2 mt-2"><select value={limit.type} onChange={(event) => updatePlan(plan.id, (item) => ({ ...item, limits: item.limits.map((entry) => entry.key === limit.key ? { ...entry, type: event.target.value as typeof entry.type, value: event.target.value === 'number' ? (entry.value ?? 0) : null } : entry) }))} className={fieldClass}><option value="number">Number</option><option value="unlimited">Unlimited</option><option value="custom">Custom</option></select><input disabled={limit.type !== 'number'} type="number" min="0" value={limit.value ?? ''} onChange={(event) => updatePlan(plan.id, (item) => ({ ...item, limits: item.limits.map((entry) => entry.key === limit.key ? { ...entry, value: Number(event.target.value), displayValue: event.target.value } : entry) }))} className={fieldClass} /></div></div>)}</div></div>
        <div><h4 className="text-xs font-black mb-2">Feature availability</h4><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">{plan.features.map((feature) => <label key={feature.key} className="border border-brand-border rounded p-3 text-xs flex items-center justify-between gap-3"><span><strong className="block">{feature.label}</strong><small className="text-gray-400">{feature.category}</small></span><select value={feature.availability} onChange={(event) => updatePlan(plan.id, (item) => ({ ...item, features: item.features.map((entry) => entry.key === feature.key ? { ...entry, availability: event.target.value as typeof entry.availability } : entry) }))} className={fieldClass}><option value="included">Included</option><option value="not-included">Not included</option><option value="custom">Custom</option><option value="coming-soon">Planned</option></select></label>)}</div></div>
        <button type="button" disabled={busy === `plans-${plan.id}`} onClick={() => void save('plans', plan.id, plan)} className="btn-dark"><Save className="w-4 h-4" />Save {plan.name}</button>
      </div>
    </details>)}</div>
    <div className="grid xl:grid-cols-2 gap-5"><CatalogEditor title="Enterprise add-ons" items={catalog.addons} update={updateAddon} save={(item) => save('addons', item.id, item)} /><CatalogEditor title="Implementation services" items={catalog.implementationServices} update={updateService} save={(item) => save('implementation-services', item.id, item)} /></div>
  </section>;
}

function CatalogEditor<T extends PricingAddon | ImplementationService>({ title, items, update, save }: { title: string; items: T[]; update: (id: string, updater: (item: T) => T) => void; save: (item: T) => Promise<void> }) {
  return <div className="bg-white border border-brand-border rounded-lg p-5"><h3 className="font-black">{title}</h3><div className="divide-y divide-brand-border mt-3">{items.map((item) => <div key={item.id} className="py-3 grid grid-cols-[minmax(0,1fr)_minmax(120px,.5fr)_auto] gap-2 items-end"><label className="text-[10px] text-gray-500">Name<input value={item.name} onChange={(event) => update(item.id, (value) => ({ ...value, name: event.target.value }))} className={`block w-full mt-1 ${fieldClass}`} /></label><label className="text-[10px] text-gray-500">Pricing<input value={item.pricingLabel} onChange={(event) => update(item.id, (value) => ({ ...value, pricingLabel: event.target.value }))} className={`block w-full mt-1 ${fieldClass}`} /></label><div className="flex items-center gap-2"><label title="Visible"><input type="checkbox" checked={item.visible} onChange={(event) => update(item.id, (value) => ({ ...value, visible: event.target.checked }))} /></label><button title="Save" type="button" onClick={() => void save(item)} className="studio-mini"><Save className="w-4 h-4" /></button></div></div>)}</div></div>;
}
