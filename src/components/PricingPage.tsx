import { useEffect, useMemo, useState } from 'react';
import { Check, Mail, Sparkles } from 'lucide-react';
import { safeFetchJson } from '../services/apiClient.ts';

export default function PricingPage({ onStart }: { onStart: () => void }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [yearly, setYearly] = useState(false);
  useEffect(() => { void safeFetchJson('/api/plans', undefined, { plans: [] }).then((data) => setPlans(data?.plans ?? [])); }, []);
  const categories = useMemo(() => [...new Set(plans.flatMap((plan) => plan.features?.map((feature: any) => feature.category) ?? []))], [plans]);
  return <main className="max-w-7xl mx-auto px-6 py-16 space-y-16">
    <section className="text-center max-w-3xl mx-auto space-y-5">
      <p className="text-xs font-mono font-bold uppercase tracking-wide text-brand-forest">Balancing Carbon Plans</p>
      <h1 className="text-4xl font-black text-brand-charcoal">Scale carbon intelligence at your pace.</h1>
      <p className="text-gray-500">Choose a database-backed plan now. Payments and feature enforcement are intentionally not enabled yet.</p>
      <div className="inline-flex p-1 bg-white border border-brand-border rounded-lg text-xs font-bold"><button onClick={() => setYearly(false)} className={`px-4 py-2 rounded ${!yearly ? 'bg-brand-charcoal text-white' : 'text-gray-500'}`}>Monthly</button><button onClick={() => setYearly(true)} className={`px-4 py-2 rounded ${yearly ? 'bg-brand-charcoal text-white' : 'text-gray-500'}`}>Yearly <span className="text-brand-sage">Save</span></button></div>
    </section>
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      {plans.map((plan) => <article key={plan.id} className={`border bg-white p-6 flex flex-col gap-5 ${plan.recommended ? 'border-brand-forest shadow-lg' : 'border-brand-border'}`}>
        <div className="flex items-start justify-between"><div><h2 className="font-black text-xl">{plan.name}</h2><p className="text-xs text-gray-500 mt-2 min-h-10">{plan.description}</p></div>{plan.badge && <span className="text-[10px] font-bold bg-brand-sage/30 text-brand-forest px-2 py-1 rounded">{plan.badge}</span>}</div>
        <div>{Number(yearly ? plan.yearlyPrice : plan.monthlyPrice) > 0 ? <><span className="text-3xl font-black">{plan.currency} {yearly ? plan.yearlyPrice : plan.monthlyPrice}</span><span className="text-xs text-gray-400"> / {yearly ? 'year' : 'month'}</span></> : <span className="text-2xl font-black">{plan.slug === 'enterprise-plus' ? 'Custom pricing' : 'Pricing on request'}</span>}</div>
        <ul className="space-y-2 text-xs text-gray-600 flex-1">{(plan.features ?? []).slice(0, 8).map((feature: any) => <li key={feature.key} className="flex gap-2"><Check className="w-4 h-4 text-brand-forest shrink-0" />{feature.label}</li>)}</ul>
        <button onClick={onStart} className="w-full bg-brand-charcoal text-white py-2.5 text-xs font-bold rounded hover:bg-black">{plan.slug === 'enterprise-plus' ? 'Contact Sales' : 'Start with ' + plan.name}</button>
      </article>)}
    </section>
    <section className="border border-brand-border bg-white p-6 overflow-x-auto"><h2 className="font-black text-xl mb-5">Feature comparison</h2><table className="w-full min-w-[720px] text-xs"><thead><tr className="border-b border-brand-border"><th className="text-left py-3">Capability</th>{plans.map((plan) => <th key={plan.id} className="text-left py-3">{plan.name}</th>)}</tr></thead><tbody>{categories.flatMap((category) => [{ category }, ...[...new Set(plans.flatMap((plan) => plan.features?.filter((feature: any) => feature.category === category).map((feature: any) => feature.label) ?? []))].map((label) => ({ label }))]).map((row: any, index) => row.category ? <tr key={'c'+index}><td colSpan={plans.length + 1} className="pt-5 pb-2 font-bold text-brand-forest">{row.category}</td></tr> : <tr key={row.label} className="border-t border-brand-border/50"><td className="py-3">{row.label}</td>{plans.map((plan) => <td key={plan.id}>{plan.features?.some((feature: any) => feature.label === row.label) ? <Check className="w-4 h-4 text-brand-forest" /> : '—'}</td>)}</tr>)}</tbody></table></section>
    <section className="grid md:grid-cols-2 gap-5"><div className="bg-brand-charcoal text-white p-7"><Sparkles className="w-5 h-5 text-brand-sage" /><h2 className="font-black text-2xl mt-4">Need a tailored deployment?</h2><p className="text-sm text-gray-300 mt-2">Enterprise+ is configured around your operating model, infrastructure, and support requirements.</p></div><div className="border border-brand-border bg-white p-7"><h2 className="font-black text-2xl">Talk to our team</h2><p className="text-sm text-gray-500 mt-2">Discuss a custom plan, migration path, or enterprise requirements.</p><a className="inline-flex mt-5 items-center gap-2 text-xs font-bold text-brand-forest" href="mailto:sales@balancingcarbon.com"><Mail className="w-4 h-4" /> Contact Sales</a></div></section>
  </main>;
}
