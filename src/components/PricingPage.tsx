import { useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Mail } from 'lucide-react';
import { safeFetchJson } from '../services/apiClient.ts';

type BillingInterval = 'monthly' | 'yearly';
type PlanFeature = { key: string; label: string; category: string; availability: string };
type Plan = { id: string; name: string; slug: string; description: string; monthlyPrice: number; yearlyPrice: number; currency: string; trialDays: number; recommended: boolean; badge: string; features: PlanFeature[] };

const formatPrice = (price: number, currency: string) => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);

function FeatureAvailability({ availability }: { availability: string }) {
  if (availability === 'included') return <Check className="w-4 h-4 text-brand-forest shrink-0" aria-label="Included" />;
  if (availability === 'coming-soon') return <Clock3 className="w-4 h-4 text-amber-600 shrink-0" aria-label="Coming soon" />;
  return <span className="w-4 text-gray-400 shrink-0">-</span>;
}

export default function PricingPage({ onStart }: { onStart: (planId: string, billingInterval: BillingInterval) => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');

  useEffect(() => { void safeFetchJson('/api/plans', undefined, { plans: [] }).then((data) => setPlans(data?.plans ?? [])); }, []);

  const categories = useMemo(() => [...new Set(plans.flatMap((plan) => plan.features?.map((feature) => feature.category) ?? []))], [plans]);
  const annualDiscount = (plan: Plan) => plan.monthlyPrice > 0 ? Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100) : 0;

  return <main className="max-w-7xl mx-auto px-6 py-14 space-y-14">
    <section className="text-center max-w-3xl mx-auto space-y-5">
      <p className="text-xs font-mono font-bold uppercase tracking-wide text-brand-forest">Balancing Carbon Plans</p>
      <h1 className="text-4xl font-black text-brand-charcoal">Carbon accounting that grows with your operation.</h1>
      <p className="text-gray-500">Start with the right operating footprint, then move up as your reporting and governance needs expand.</p>
      <div className="inline-flex p-1 bg-white border border-brand-border rounded-lg text-xs font-bold" role="group" aria-label="Billing interval">
        <button onClick={() => setBillingInterval('monthly')} className={`px-4 py-2 rounded ${billingInterval === 'monthly' ? 'bg-brand-charcoal text-white' : 'text-gray-500'}`}>Monthly</button>
        <button onClick={() => setBillingInterval('yearly')} className={`px-4 py-2 rounded ${billingInterval === 'yearly' ? 'bg-brand-charcoal text-white' : 'text-gray-500'}`}>Yearly <span className="text-brand-sage">Save 17%</span></button>
      </div>
    </section>

    <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {plans.map((plan) => {
        const price = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
        return <article key={plan.id} className={`border bg-white p-6 flex flex-col gap-5 ${plan.recommended ? 'border-brand-forest shadow-lg' : 'border-brand-border'}`}>
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-xl">{plan.name}</h2><p className="text-xs text-gray-500 mt-2 min-h-10">{plan.description}</p></div>{plan.badge && <span className="text-[10px] font-bold bg-brand-sage/30 text-brand-forest px-2 py-1 rounded">{plan.badge}</span>}</div>
          <div><span className="text-3xl font-black text-brand-charcoal">{formatPrice(price, plan.currency)}</span><span className="text-xs text-gray-400"> / {billingInterval === 'yearly' ? 'year' : 'month'}</span>{billingInterval === 'yearly' && <p className="text-[10px] text-brand-forest font-bold mt-1">Save {annualDiscount(plan)}% compared with monthly</p>}</div>
          <ul className="space-y-2 text-xs text-gray-600 flex-1">{plan.features.slice(0, 8).map((feature) => <li key={feature.key} className="flex gap-2"><FeatureAvailability availability={feature.availability} /><span>{feature.label}{feature.availability === 'coming-soon' && <span className="text-gray-400"> (coming soon)</span>}</span></li>)}</ul>
          <button onClick={() => onStart(plan.id, billingInterval)} className="w-full bg-brand-charcoal text-white py-2.5 text-xs font-bold rounded hover:bg-black">Start {plan.trialDays}-day trial</button>
        </article>;
      })}
    </section>

    <section className="border border-brand-border bg-white p-6 overflow-x-auto"><h2 className="font-black text-xl mb-5">Feature comparison</h2><table className="w-full min-w-[680px] text-xs"><thead><tr className="border-b border-brand-border"><th className="text-left py-3">Capability</th>{plans.map((plan) => <th key={plan.id} className="text-left py-3">{plan.name}</th>)}</tr></thead><tbody>{categories.flatMap((category) => [{ category }, ...[...new Set(plans.flatMap((plan) => plan.features.filter((feature) => feature.category === category).map((feature) => feature.label)))].map((label) => ({ label }))]).map((row: { category?: string; label?: string }, index) => row.category ? <tr key={`category-${index}`}><td colSpan={plans.length + 1} className="pt-5 pb-2 font-bold text-brand-forest">{row.category}</td></tr> : <tr key={row.label} className="border-t border-brand-border/50"><td className="py-3">{row.label}</td>{plans.map((plan) => { const feature = plan.features.find((item) => item.label === row.label); return <td key={plan.id}>{feature ? <FeatureAvailability availability={feature.availability} /> : <span className="text-gray-400">-</span>}</td>; })}</tr>)}</tbody></table></section>

    <section className="grid md:grid-cols-2 gap-5"><div className="bg-brand-charcoal text-white p-7"><h2 className="font-black text-2xl">Need help choosing a plan?</h2><p className="text-sm text-gray-300 mt-2">Talk through reporting scope, facilities, and implementation needs with our carbon team.</p></div><div className="border border-brand-border bg-white p-7"><h2 className="font-black text-2xl">Talk to our team</h2><p className="text-sm text-gray-500 mt-2">Discuss your carbon accounting programme and the right rollout for your organisation.</p><a className="inline-flex mt-5 items-center gap-2 text-xs font-bold text-brand-forest" href="mailto:sales@balancingcarbon.com"><Mail className="w-4 h-4" /> Contact Sales</a></div></section>

    <section className="max-w-3xl mx-auto"><h2 className="font-black text-xl text-brand-charcoal">Pricing questions</h2><div className="mt-5 divide-y divide-brand-border border-y border-brand-border">{[['Does every plan include one organisation?', 'Yes. Starter, Professional, and Enterprise each support one organisation.'], ['What does yearly billing save?', 'Annual pricing is about 17% lower than paying monthly for twelve months.'], ['Can we change plans later?', 'Organisation administrators can change the saved plan in subscription settings.']].map(([question, answer]) => <div key={question} className="py-4"><h3 className="font-bold text-sm">{question}</h3><p className="text-sm text-gray-500 mt-1">{answer}</p></div>)}</div></section>
  </main>;
}
