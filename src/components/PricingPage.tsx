import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  Database,
  FileScan,
  Gauge,
  Headphones,
  Minus,
  Plus,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import {
  defaultImplementationServices,
  defaultPricingAddons,
  defaultPricingPlans,
  type BillingInterval,
  type ImplementationService,
  type PricingAddon,
  type PricingAvailability,
  type PricingPlan,
} from '../../shared/pricingCatalog.ts';
import { safeFetchJson } from '../services/apiClient.ts';

type PricingCatalog = { plans: PricingPlan[]; addons: PricingAddon[]; implementationServices: ImplementationService[]; source?: string };

const formatPrice = (price: number, currency: string) => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
const formatNumber = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);

function useAnimatedNumber(value: number, duration = 500) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current;
    const startedAt = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      setDisplay(Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(animate);
      else previous.current = value;
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);
  return display;
}

const limitLabels: Record<string, { label: string; icon: typeof Gauge }> = {
  facilities: { label: 'Facilities', icon: Building2 },
  plants: { label: 'Plants', icon: ServerCog },
  team_members: { label: 'Team members', icon: Users },
  ocr_pages_month: { label: 'OCR pages', icon: FileScan },
  ai_reports_month: { label: 'AI reports', icon: Sparkles },
  storage_gb: { label: 'Storage', icon: Database },
  api_calls_month: { label: 'API calls', icon: Gauge },
};

const featureHighlights: Record<string, string[]> = {
  free: ['Scope 1 and Scope 2', 'Basic dashboard and calculator', 'Manual data entry', 'Monthly summary', 'Community support'],
  starter: ['Everything in Free', 'Basic Scope 3 and AI OCR', 'Bill, Excel and CSV imports', 'PDF reports and Basic BRSR', 'Email support'],
  professional: ['Everything in Starter', 'Complete Scope 3 and Supplier Portal', 'Carbon Copilot, recommendations and forecasting', 'BRSR, GRI and CBAM workflows', 'API, ERP, approvals and audit trail'],
  enterprise: ['Everything in Professional', 'Unlimited facilities, plants and users', 'Private cloud or on-premise options', 'SAP, Oracle, Dynamics, IoT and SCADA', 'Custom AI, security review and dedicated SLA'],
};

function Availability({ value, text = true }: { value: PricingAvailability; text?: boolean }) {
  if (value === 'included') return <span className="pricing-availability pricing-availability-included"><Check />{text && 'Included'}</span>;
  if (value === 'custom') return <span className="pricing-availability pricing-availability-custom"><ServerCog />{text && 'Custom'}</span>;
  if (value === 'coming-soon') return <span className="pricing-availability pricing-availability-coming"><Sparkles />{text && 'Planned'}</span>;
  return <span className="pricing-availability pricing-availability-empty"><Minus />{text && 'Not included'}</span>;
}

type LimitScale = { maximum: number; hasOpenEndedTier: boolean };

function PlanLimitGrid({ plan, scales }: { plan: PricingPlan; scales: Record<string, LimitScale> }) {
  return <div className="pricing-limit-grid">{plan.limits.map((limit) => {
    const config = limitLabels[limit.key] ?? { label: limit.key.replaceAll('_', ' '), icon: Gauge };
    const Icon = config.icon;
    const scale = scales[limit.key] ?? { maximum: 0, hasOpenEndedTier: false };
    const finiteValue = limit.type === 'number' ? Math.max(0, Number(limit.value) || 0) : 0;
    const width = limit.type === 'unlimited' || limit.type === 'custom'
      ? 100
      : scale.maximum > 0
        ? Math.min(100, (finiteValue / scale.maximum) * (scale.hasOpenEndedTier ? 82 : 100))
        : 0;
    return <div className="pricing-limit" key={limit.key}><div><span><Icon />{config.label}</span><strong>{limit.displayValue}</strong></div><div className={`pricing-limit-track pricing-limit-track-${limit.type}`} aria-hidden="true"><i style={{ width: `${width}%` }} /></div></div>;
  })}</div>;
}

function PricingFaq() {
  const [open, setOpen] = useState(0);
  const items = [
    ['Can I upgrade at any time?', 'Yes. Organisation administrators can move to a higher plan as operating needs expand. Entitlements and usage limits are refreshed from the active subscription.'],
    ['Can I downgrade?', 'Yes, subject to data retention and active usage. We review facilities, users, storage and enabled modules before a downgrade so governed records are not silently removed.'],
    ['How does AI usage work?', 'AI reports and OCR pages are measured separately. AI output remains advisory, cites available platform records, and requires human review before external use.'],
    ['What is OCR?', 'Optical character recognition extracts candidate fields from documents such as electricity bills and invoices. Extracted values still pass through validation and approval before entering a ledger.'],
    ['Do unused AI credits roll over?', 'Monthly included usage does not currently roll over. Contracted enterprise capacity and additional credit packs can use custom commercial terms.'],
    ['Do you support annual billing?', 'Yes. Starter and Professional annual pricing currently reflects approximately two months of savings compared with twelve monthly payments.'],
    ['Can Balancing Carbon run on-premise?', 'On-premise and private-cloud deployment are Enterprise options subject to architecture, security, infrastructure and support review.'],
    ['How does onboarding work?', 'Onboarding starts with boundaries, facilities, source systems and reporting priorities. Implementation services can then cover migration, factors, integrations, training and controlled rollout.'],
  ];
  return <div className="pricing-faq-list">{items.map(([question, answer], index) => <div key={question} className="pricing-faq-item"><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}><span>{question}</span>{open === index ? <Minus /> : <Plus />}</button>{open === index && <p>{answer}</p>}</div>)}</div>;
}

export default function PricingPage({ onStart }: { onStart: (planId: string, billingInterval: BillingInterval) => void }) {
  const [catalog, setCatalog] = useState<PricingCatalog>({ plans: defaultPricingPlans, addons: defaultPricingAddons, implementationServices: defaultImplementationServices });
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [expandedPlan, setExpandedPlan] = useState('');
  const [fullComparison, setFullComparison] = useState(false);
  const [addonCategory, setAddonCategory] = useState('All');
  const [facilities, setFacilities] = useState(3);
  const [employees, setEmployees] = useState(120);
  const [monthlyUtilityBills, setMonthlyUtilityBills] = useState(800000);
  const [consultants, setConsultants] = useState(1);
  const [reportingFrequency, setReportingFrequency] = useState(4);

  useEffect(() => {
    void safeFetchJson('/api/pricing-catalog', undefined, catalog).then((data) => {
      if (data?.plans?.length) setCatalog({ plans: data.plans, addons: data.addons ?? [], implementationServices: data.implementationServices ?? [] });
    });
  }, []);

  const plans = useMemo(() => catalog.plans.filter((plan) => plan.active !== false && plan.visible !== false).sort((a, b) => a.sortOrder - b.sortOrder), [catalog.plans]);
  const limitScales = useMemo(() => plans.reduce<Record<string, LimitScale>>((scales, plan) => {
    plan.limits.forEach((limit) => {
      const scale = scales[limit.key] ?? { maximum: 0, hasOpenEndedTier: false };
      if (limit.type === 'number' && typeof limit.value === 'number' && limit.value > 0) {
        scale.maximum = Math.max(scale.maximum, limit.value);
      } else if (limit.type === 'unlimited' || limit.type === 'custom') {
        scale.hasOpenEndedTier = true;
      }
      scales[limit.key] = scale;
    });
    return scales;
  }, {}), [plans]);
  const featureCategories = useMemo(() => [...new Set(plans.flatMap((plan) => plan.features.map((feature) => feature.category)))], [plans]);
  const addonCategories = useMemo(() => ['All', ...new Set(catalog.addons.map((addon) => addon.category))], [catalog.addons]);
  const shownAddons = addonCategory === 'All' ? catalog.addons : catalog.addons.filter((addon) => addon.category === addonCategory);

  const roi = useMemo(() => {
    const annualReportingCycles = Math.max(1, reportingFrequency);
    const estimatedHoursSaved = Math.round(facilities * annualReportingCycles * 18 + employees * 0.4 + consultants * 80);
    const estimatedCostSaved = Math.round(estimatedHoursSaved * 900 + consultants * 300000);
    const estimatedAnnualMWh = monthlyUtilityBills > 0 ? (monthlyUtilityBills * 12) / 8000 : 0;
    const estimatedCo2Managed = Math.round(estimatedAnnualMWh * 0.7);
    const recommendedPlan = facilities > 20 || employees > 500 ? 'Enterprise' : facilities > 3 || employees > 100 ? 'Professional' : facilities > 1 || consultants > 0 ? 'Starter' : 'Free';
    const plan = plans.find((item) => item.name === recommendedPlan);
    const annualCost = plan?.contactSales ? 0 : Number(plan?.yearlyPrice ?? 0);
    const estimatedRoi = annualCost > 0 ? Math.round(((estimatedCostSaved - annualCost) / annualCost) * 100) : null;
    return { estimatedHoursSaved, estimatedCostSaved, estimatedCo2Managed, recommendedPlan, estimatedRoi };
  }, [consultants, employees, facilities, monthlyUtilityBills, plans, reportingFrequency]);
  const animatedHours = useAnimatedNumber(roi.estimatedHoursSaved);
  const animatedCost = useAnimatedNumber(roi.estimatedCostSaved);
  const animatedCo2 = useAnimatedNumber(roi.estimatedCo2Managed);
  const animatedRoi = useAnimatedNumber(roi.estimatedRoi ?? 0);

  const handlePlanAction = (plan: PricingPlan) => {
    if (plan.ctaAction === 'sales' || plan.ctaAction === 'demo') {
      const subject = encodeURIComponent(`${plan.name} plan enquiry`);
      window.location.href = `mailto:sales@balancingcarbon.com?subject=${subject}`;
      return;
    }
    onStart(plan.id, billingInterval);
  };

  return <main className="pricing-page">
    <section className="pricing-hero">
      <div className="pricing-hero-copy">
        <span className="pricing-eyebrow"><ShieldCheck /> Enterprise carbon intelligence</span>
        <h1>Pricing built around the maturity of your carbon programme.</h1>
        <p>Start with governed measurement, then add value-chain visibility, reporting, AI and enterprise integrations as operational complexity grows.</p>
        <div className="pricing-assurance"><span><Check /> No credit card for Free</span><span><Check /> Implementation options available</span><span><Check /> Enterprise security review</span></div>
      </div>
      <div className="pricing-hero-control">
        <p>Choose billing cadence</p>
        <div role="group" aria-label="Billing interval"><button type="button" onClick={() => setBillingInterval('monthly')} className={billingInterval === 'monthly' ? 'active' : ''}>Monthly</button><button type="button" onClick={() => setBillingInterval('yearly')} className={billingInterval === 'yearly' ? 'active' : ''}>Annual <span>Save ~17%</span></button></div>
        <small>Annual contracts are billed once per year. Enterprise commercials are custom.</small>
      </div>
    </section>

    <section className="pricing-plan-section" aria-labelledby="plans-title">
      <div className="pricing-section-heading"><div><span>Plans</span><h2 id="plans-title">Choose the operating model that fits today.</h2></div><p>Every tier protects calculation lineage. Higher tiers expand automation, collaboration, reporting and integration capacity.</p></div>
      <div className="pricing-plan-grid">{plans.map((plan) => {
        const price = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
        const open = expandedPlan === plan.id;
        return <article key={plan.id} className={`pricing-plan-card ${plan.recommended ? 'recommended' : ''}`}>
          {plan.badge && <span className="pricing-plan-badge">{plan.badge}</span>}
          <div className="pricing-plan-head"><h3>{plan.name}</h3><p>{plan.description}</p></div>
          <div className="pricing-price">{plan.contactSales ? <strong>Custom quote</strong> : plan.monthlyPrice === 0 ? <strong>Free forever</strong> : <><strong>{formatPrice(price, plan.currency)}</strong><span>/{billingInterval === 'yearly' ? 'year' : 'month'}</span></>}{billingInterval === 'yearly' && Boolean(plan.promotion.annualSavingsPercent) && <mark className="pricing-savings-badge">Save {plan.promotion.annualSavingsPercent}%</mark>}{billingInterval === 'yearly' && !plan.contactSales && plan.yearlyPrice > 0 && <small>Equivalent to {formatPrice(Math.round(plan.yearlyPrice / 12), plan.currency)} per month</small>}</div>
          <p className="pricing-plan-value">{plan.valueProposition}</p>
          <div className="pricing-audience"><span>Best for</span><p>{plan.targetAudience.join(' · ')}</p></div>
          <ul>{(featureHighlights[plan.slug] ?? []).map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>
          {open && <div className="pricing-expanded"><h4>Included capacity</h4><PlanLimitGrid plan={plan} scales={limitScales} /><h4>Feature status</h4><div>{plan.features.filter((feature) => feature.availability !== 'not-included').map((feature) => <span key={feature.key}><Availability value={feature.availability} text={false} />{feature.label}</span>)}</div></div>}
          <button type="button" className="pricing-expand" aria-expanded={open} onClick={() => setExpandedPlan(open ? '' : plan.id)}>{open ? 'Show less' : 'View plan detail'}<ChevronDown className={open ? 'rotate-180' : ''} /></button>
          <button type="button" className="pricing-cta" onClick={() => handlePlanAction(plan)}>{plan.ctaLabel}<ArrowRight /></button>
        </article>;
      })}</div>
    </section>

    <section className="pricing-usage-section">
      <div className="pricing-section-heading light"><div><span>Capacity</span><h2>Usage limits made visible before you buy.</h2></div><p>OCR, AI, storage, integrations, users and operating sites scale independently as the programme matures.</p></div>
      <div className="pricing-usage-grid">{plans.map((plan) => <article key={plan.id}><div><h3>{plan.name}</h3><span>{plan.contactSales ? 'Contracted capacity' : 'Included each billing cycle'}</span></div><PlanLimitGrid plan={plan} scales={limitScales} /></article>)}</div>
    </section>

    <section className="pricing-comparison-section">
      <div className="pricing-section-heading"><div><span>Comparison</span><h2>Evaluate governance, not only feature count.</h2></div><button type="button" className="pricing-comparison-toggle" onClick={() => setFullComparison((value) => !value)}>{fullComparison ? 'Show essentials' : 'Show full comparison'}<BarChart3 /></button></div>
      <div className="pricing-table-wrap"><table><thead><tr><th>Capability</th>{plans.map((plan) => <th key={plan.id}>{plan.name}{plan.recommended && <small>Recommended</small>}</th>)}</tr></thead><tbody>{featureCategories.flatMap((category) => {
        const rows = [...new Set(plans.flatMap((plan) => plan.features.filter((feature) => feature.category === category).map((feature) => feature.label)))];
        const selected = fullComparison ? rows : rows.filter((_, index) => index < 3);
        return [<tr className="pricing-category-row" key={category}><td colSpan={plans.length + 1}>{category}</td></tr>, ...selected.map((label) => <tr key={`${category}-${label}`}><td>{label}</td>{plans.map((plan) => { const feature = plan.features.find((item) => item.label === label); return <td key={plan.id}><Availability value={feature?.availability ?? 'not-included'} /></td>; })}</tr>)];
      })}</tbody></table></div>
    </section>

    <section className="pricing-addon-section">
      <div className="pricing-section-heading"><div><span>Enterprise add-ons</span><h2>Assemble the modules your operating model needs.</h2></div><p>Add capacity and specialist workflows without forcing unrelated modules into the core subscription.</p></div>
      <div className="pricing-filter" role="group" aria-label="Add-on category">{addonCategories.map((category) => <button type="button" className={addonCategory === category ? 'active' : ''} onClick={() => setAddonCategory(category)} key={category}>{category}</button>)}</div>
      <div className="pricing-addon-grid">{shownAddons.map((addon) => <article key={addon.id}><span>{addon.category}</span><h3>{addon.name}</h3><p>{addon.description}</p><strong>{addon.benefit}</strong><footer><em>{addon.pricingLabel}</em><a href={`mailto:sales@balancingcarbon.com?subject=${encodeURIComponent(`${addon.name} add-on`)}`}>Discuss module <ArrowRight /></a></footer></article>)}</div>
    </section>

    <section className="pricing-services-section">
      <div className="pricing-services-intro"><span>Professional services</span><h2>Implementation support for complex starting points.</h2><p>Bring historical data, system integrations, factors, reporting frameworks and operating teams into a controlled rollout.</p><a href="mailto:sales@balancingcarbon.com?subject=Implementation%20services">Plan implementation <ArrowRight /></a></div>
      <div className="pricing-service-list">{catalog.implementationServices.map((service) => <article key={service.id}><div><ServerCog /><span><strong>{service.name}</strong><small>{service.description}</small></span></div><em>{service.pricingLabel}</em></article>)}</div>
    </section>

    <section className="pricing-roi-section">
      <div className="pricing-roi-inputs"><span className="pricing-eyebrow"><Gauge /> Business case model</span><h2>Estimate the operational value of a connected carbon workflow.</h2><p>Adjust the profile below. Results are planning estimates, not savings guarantees or an emissions inventory.</p><div className="pricing-roi-fields"><label>Facilities<input type="number" min="1" value={facilities} onChange={(event) => setFacilities(Math.max(1, Number(event.target.value)))} /></label><label>Employees<input type="number" min="1" value={employees} onChange={(event) => setEmployees(Math.max(1, Number(event.target.value)))} /></label><label>Monthly utility bills (INR)<input type="number" min="0" value={monthlyUtilityBills} onChange={(event) => setMonthlyUtilityBills(Math.max(0, Number(event.target.value)))} /></label><label>External consultants used<input type="number" min="0" value={consultants} onChange={(event) => setConsultants(Math.max(0, Number(event.target.value)))} /></label><label>Reporting cycles per year<select value={reportingFrequency} onChange={(event) => setReportingFrequency(Number(event.target.value))}><option value="1">Annual</option><option value="2">Half-yearly</option><option value="4">Quarterly</option><option value="12">Monthly</option></select></label></div></div>
      <div className="pricing-roi-results"><span>Illustrative annual impact</span><div><small>Estimated hours saved</small><strong>{formatNumber(animatedHours)}</strong><em>hours</em></div><div><small>Estimated cost capacity</small><strong>{formatPrice(animatedCost, 'INR')}</strong><em>workflow value</em></div><div><small>Estimated CO2e data managed</small><strong>{formatNumber(animatedCo2)}</strong><em>tCO2e activity proxy</em></div><div><small>Estimated software ROI</small><strong>{roi.estimatedRoi === null ? 'Custom' : `${animatedRoi}%`}</strong><em>before implementation costs</em></div><footer><span>Recommended operating plan</span><strong>{roi.recommendedPlan}</strong></footer><p>Assumptions: INR 900/hour workflow capacity, INR 300,000 annual consultant displacement, INR 8,000/MWh and 0.7 tCO2e/MWh activity proxy. Replace with customer-specific inputs during discovery.</p></div>
    </section>

    <section className="pricing-faq-section"><div className="pricing-section-heading"><div><span>Pricing FAQ</span><h2>Commercial and operating questions.</h2></div><CircleHelp /></div><PricingFaq /></section>

    <section className="pricing-final-cta"><div><span>Build the right starting point</span><h2>Turn a pricing decision into an operating roadmap.</h2><p>Discuss boundaries, facilities, reporting obligations, source systems, users and implementation priorities with our team.</p></div><div><a href="mailto:sales@balancingcarbon.com?subject=Balancing%20Carbon%20pricing">Talk to Sales <ArrowRight /></a><button type="button" onClick={() => onStart('plan-free', 'monthly')}>Start Free</button></div></section>
  </main>;
}
