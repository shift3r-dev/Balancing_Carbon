import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Circle, Compass, GraduationCap, HelpCircle, LoaderCircle, Play, Search, ShieldCheck, Sparkles, X } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext.tsx';
import { safeFetchJson } from '../services/apiClient.ts';
import type { ViewState } from '../types.ts';

type Summary = { signals: Record<string, boolean | number>; progress: Array<{ item_key: string; status: string }>; roles: string[]; permissions: string[] };
type Task = { key: string; title: string; description: string; view: ViewState; signal?: string; manual?: boolean; roles?: string[] };
type TourStep = { title: string; body: string; view: ViewState };

const tasks: Task[] = [
  { key: 'profile-reviewed', title: 'Review organisation profile', description: 'Confirm industry, reporting year and operating location.', view: 'dashboard-company', signal: 'organisationProfile' },
  { key: 'facility-created', title: 'Register the first facility', description: 'Create the plant boundary used by ledgers and reports.', view: 'dashboard-facilities', signal: 'facilities' },
  { key: 'team-invited', title: 'Add your implementation team', description: 'Invite colleagues and give each person the smallest required role.', view: 'dashboard-settings', signal: 'members', roles: ['Organization Admin','Super Admin','Platform Admin'] },
  { key: 'activity-added', title: 'Record operational activity', description: 'Add electricity or fuel data with a governed unit and factor.', view: 'dashboard-energy', signal: 'activities' },
  { key: 'production-added', title: 'Add production output', description: 'Provide the denominator required for carbon intensity.', view: 'dashboard-energy', signal: 'production' },
  { key: 'evidence-added', title: 'Upload supporting evidence', description: 'Attach invoices, permits or calculation support to the evidence vault.', view: 'dashboard-documents', signal: 'documents' },
  { key: 'first-dashboard-review', title: 'Review the calculated dashboard', description: 'Check completeness, scopes, hotspots and missing-data warnings.', view: 'dashboard-overview', manual: true },
  { key: 'project-created', title: 'Create a reduction project', description: 'Convert an opportunity into an owned, measurable action.', view: 'dashboard-intelligence', signal: 'projects', roles: ['Sustainability Manager','Organization Admin','Super Admin','Platform Admin'] },
  { key: 'report-created', title: 'Create the first governed report', description: 'Generate a report from calculation and evidence snapshots.', view: 'dashboard-reports', signal: 'reports', roles: ['Sustainability Manager','Organization Admin','Auditor','Super Admin','Platform Admin'] },
];

const tours: Record<string, { title: string; description: string; steps: TourStep[] }> = {
  'tour-platform': { title: 'Platform essentials', description: 'Follow the complete collect-to-report workflow.', steps: [
    { title: 'Set the organisational boundary', body: 'Start with the organisation and facilities. Every operational record is tenant and facility scoped.', view: 'dashboard-facilities' },
    { title: 'Collect operational data', body: 'Use the Energy Ledger for governed activity and production records. The public calculator remains a sandbox.', view: 'dashboard-energy' },
    { title: 'Review intelligence', body: 'Use diagnostics only after data completeness and production coverage are sufficient.', view: 'dashboard-intelligence' },
    { title: 'Publish evidence-backed reports', body: 'Compose, review, approve and publish from ESG Reporting Studio.', view: 'dashboard-reports' },
  ] },
  'tour-data': { title: 'Data collection workflow', description: 'Learn imports, staging and operational posting.', steps: [
    { title: 'Choose a registered facility', body: 'Every imported operational row needs a valid facility boundary.', view: 'dashboard-data-platform' },
    { title: 'Validate before staging', body: 'Map fields, inspect invalid rows and resolve unit or duplicate findings.', view: 'dashboard-data-platform' },
    { title: 'Approve and post', body: 'Approved staging rows affect ledgers only after an explicit Post action.', view: 'dashboard-data-platform' },
  ] },
  'tour-reporting': { title: 'ESG reporting workflow', description: 'From template to locked publication.', steps: [
    { title: 'Generate from a governed template', body: 'The first version preserves carbon calculations and validation findings.', view: 'dashboard-reports' },
    { title: 'Compose and evidence', body: 'Arrange pages and blocks, apply branding, and link evidence to claims.', view: 'dashboard-reports' },
    { title: 'Review and approve', body: 'Authors submit; authorized reviewers approve or request changes.', view: 'dashboard-reports' },
    { title: 'Publish and export', body: 'Publishing locks the report. PDF, DOCX, PPTX and XLSX exports remain auditable.', view: 'dashboard-reports' },
  ] },
  'tour-auditor': { title: 'Auditor review', description: 'Trace claims without changing operational data.', steps: [
    { title: 'Start with data quality', body: 'Read completeness warnings and boundary information before evaluating totals.', view: 'dashboard-overview' },
    { title: 'Inspect evidence', body: 'Verify document provenance, extraction state and record linkage.', view: 'dashboard-documents' },
    { title: 'Review report snapshots', body: 'Check report evidence, calculation versions and approval history before approval.', view: 'dashboard-reports' },
  ] },
};

const guides = [
  { id: 'carbon-basics', category: 'Carbon accounting', title: 'From activity data to tCO2e', text: 'Activity quantity is normalized to a canonical unit, multiplied by an approved emission factor, and stored with factor version and calculation lineage. Never treat a missing factor as zero.' },
  { id: 'boundaries', category: 'Carbon accounting', title: 'Scopes and operating boundaries', text: 'Scope 1 covers controlled direct sources. Scope 2 covers purchased energy. Facility and reporting-period boundaries must be defined before comparing totals.' },
  { id: 'units', category: 'Data collection', title: 'Units and conversions', text: 'Select the unit reported by the source document. The registry converts compatible units and rejects incompatible dimensions instead of guessing.' },
  { id: 'import', category: 'Data collection', title: 'CSV import and staging', text: 'Validate mappings, fix invalid facilities and units, add valid rows to staging, approve them, then post. Staging rows do not affect dashboard totals.' },
  { id: 'evidence', category: 'Evidence', title: 'What counts as evidence?', text: 'Use source documents that support the quantity, period, facility and source type: bills, meter exports, invoices, permits and verified calculation workpapers.' },
  { id: 'quality', category: 'Evidence', title: 'Understanding data quality', text: 'Completeness reflects available records, production coverage, evidence and approvals. A high total is not the same as high-quality data.' },
  { id: 'dashboard', category: 'Intelligence', title: 'Reading the dashboard', text: 'Start with completeness and boundaries, then scopes, sources, facility intensity and trends. Avoid causal conclusions from a simple month-to-month change.' },
  { id: 'scenarios', category: 'Intelligence', title: 'Scenarios are not forecasts', text: 'A scenario changes explicit variables against an immutable baseline. It is a transparent sensitivity calculation, not a guarantee or prediction.' },
  { id: 'reports', category: 'Reporting', title: 'Report lifecycle', text: 'Drafts can be edited. Under-review reports await a reviewer. Approved reports can be published. Published reports are locked and versioned.' },
  { id: 'ai', category: 'AI', title: 'Using Carbon Copilot safely', text: 'The local model receives bounded tenant context and provides advisory drafts. Verify citations and calculations; AI cannot mutate ledgers or approve reports.' },
  { id: 'roles', category: 'Administration', title: 'Choosing user roles', text: 'Administrators configure the tenant, managers operate the programme, operators enter data, and auditors review. Grant the smallest role required.' },
  { id: 'troubleshooting', category: 'Troubleshooting', title: 'Why is my report blocked?', text: 'Check for missing current calculations, invalid boundaries, insufficient evidence, unapproved activity records, plan entitlement and workflow status.' },
];

export function useEnablement() {
  const [summary, setSummary] = useState<Summary | null>(null); const [loading, setLoading] = useState(true);
  const refresh = async () => { setLoading(true); const data = await safeFetchJson('/api/enablement/summary', undefined, null); setSummary(data?.signals ? data : null); setLoading(false); };
  useEffect(() => { void refresh(); const listener = () => void refresh(); window.addEventListener('balancing-carbon-enablement-updated', listener); return () => window.removeEventListener('balancing-carbon-enablement-updated', listener); }, []);
  const update = async (key: string, itemType: string, status: string = 'completed') => { const data = await safeFetchJson(`/api/enablement/progress/${key}`, { method: 'PUT', body: JSON.stringify({ itemType, status }) }, null); if (data?.progress) { await refresh(); window.dispatchEvent(new Event('balancing-carbon-enablement-updated')); } return Boolean(data?.progress); };
  return { summary, loading, update, refresh };
}

const isTaskComplete = (task: Task, summary: Summary | null) => {
  if (!summary) return false; const saved = summary.progress.find((item) => item.item_key === task.key)?.status === 'completed';
  if (task.manual) return saved; const signal = task.signal ? summary.signals[task.signal] : false;
  if (task.key === 'team-invited') return Number(signal) > 1; return typeof signal === 'number' ? signal > 0 : Boolean(signal) || saved;
};
const roleTasks = (summary: Summary | null) => {
  const roles = summary?.roles ?? [];
  const limitedKeys = roles.includes('Auditor')
    ? new Set(['evidence-added','first-dashboard-review','report-created'])
    : roles.includes('Operator')
      ? new Set(['facility-created','activity-added','production-added','evidence-added','first-dashboard-review'])
      : roles.includes('Plant Manager')
        ? new Set(['facility-created','activity-added','production-added','evidence-added','first-dashboard-review','project-created'])
        : null;
  return tasks.filter((task) => (!limitedKeys || limitedKeys.has(task.key)) && (!task.roles || task.roles.some((role) => roles.includes(role))));
};

export function OnboardingWidget({ onNavigate, onOpenHelp }: { onNavigate: (view: ViewState) => void; onOpenHelp: () => void }) {
  const { summary, loading, update } = useEnablement(); const relevant = roleTasks(summary), completed = relevant.filter((task) => isTaskComplete(task, summary)).length, next = relevant.find((task) => !isTaskComplete(task, summary));
  if (loading) return null;
  return <section className="bg-white border border-brand-border rounded-lg px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-4" data-help-id="onboarding-progress"><div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 bg-brand-sage text-brand-forest rounded flex items-center justify-center"><Compass className="w-5 h-5" /></div><div><div className="flex gap-2 items-center"><h2 className="text-xs font-black">Implementation progress</h2><span className="text-[10px] font-mono text-brand-forest">{completed}/{relevant.length}</span></div><div className="mt-1 w-52 max-w-full h-1.5 bg-brand-offwhite"><div className="h-full bg-brand-forest" style={{ width: `${relevant.length ? completed / relevant.length * 100 : 0}%` }} /></div></div></div>{next ? <div className="lg:ml-auto flex flex-col sm:flex-row sm:items-center gap-2"><div><p className="text-[10px] text-gray-400 uppercase font-mono">Recommended next</p><p className="text-xs font-bold">{next.title}</p></div><button onClick={() => { if (next.manual) void update(next.key, 'task'); onNavigate(next.view); }} className="btn-primary whitespace-nowrap">Open task <ArrowRight className="w-3.5 h-3.5" /></button></div> : <p className="lg:ml-auto text-xs font-bold text-brand-forest flex gap-1.5"><CheckCircle2 className="w-4 h-4" />Core setup complete</p>}<button title="Open learning centre" onClick={onOpenHelp} className="studio-mini"><HelpCircle /></button></section>;
}

export function FirstRunWelcome({ onNavigate, onOpenHelp }: { onNavigate: (view: ViewState) => void; onOpenHelp: () => void }) {
  const { summary, loading, update } = useEnablement(); const dismissed = summary?.progress.some((item) => item.item_key === 'welcome-dismissed' && ['completed','dismissed'].includes(item.status)); const relevant = roleTasks(summary), completed = relevant.filter((task) => isTaskComplete(task, summary)).length, next = relevant.find((task) => !isTaskComplete(task, summary));
  if (loading || !summary || dismissed || completed >= relevant.length) return null;
  return <div className="fixed inset-0 bg-black/45 z-[300] flex items-center justify-center p-4"><section className="bg-white border border-brand-border rounded-lg w-full max-w-2xl shadow-xl overflow-hidden"><div className="bg-brand-charcoal text-white p-6"><div className="flex justify-between gap-3"><div><p className="text-[10px] text-brand-sage uppercase font-mono">Welcome to Balancing Carbon</p><h2 className="text-2xl font-black mt-1">Your guided implementation starts here</h2></div><button title="Dismiss welcome" onClick={() => void update('welcome-dismissed','preference','dismissed')} className="w-9 h-9 border border-white/20 rounded flex items-center justify-center"><X className="w-4 h-4" /></button></div><p className="text-sm text-gray-300 mt-2">Your checklist is adapted to {summary.roles.join(', ') || 'your assigned role'} and completes from real organisation data.</p></div><div className="p-6"><div className="grid sm:grid-cols-3 gap-3">{relevant.slice(0,3).map((task, index) => <div key={task.key} className="border border-brand-border p-3 rounded"><p className="text-[9px] font-mono text-gray-400">STEP {index + 1}</p><p className="text-xs font-bold mt-1">{task.title}</p></div>)}</div><div className="mt-5 flex flex-col sm:flex-row gap-2"><button onClick={() => { if (next) onNavigate(next.view); void update('welcome-dismissed','preference','dismissed'); }} className="btn-primary flex-1 justify-center">Start with {next?.title ?? 'the dashboard'} <ArrowRight className="w-4 h-4" /></button><button onClick={() => { onOpenHelp(); void update('welcome-dismissed','preference','dismissed'); }} className="btn-secondary flex-1">Explore Learning Centre</button></div></div></section></div>;
}

export default function LearningCentre({ onNavigate }: { onNavigate: (view: ViewState) => void }) {
  const { summary, loading, update } = useEnablement(); const { authorization } = useAuth(); const [query, setQuery] = useState(''); const [category, setCategory] = useState('All'); const [activeTour, setActiveTour] = useState(''); const [tourStep, setTourStep] = useState(0);
  const relevant = roleTasks(summary), completed = relevant.filter((task) => isTaskComplete(task, summary)).length;
  const categories = ['All', ...new Set(guides.map((guide) => guide.category))]; const filtered = guides.filter((guide) => (category === 'All' || guide.category === category) && `${guide.title} ${guide.text} ${guide.category}`.toLowerCase().includes(query.toLowerCase()));
  const visibleTours = Object.entries(tours).filter(([key]) => key !== 'tour-auditor' || authorization?.roles.includes('Auditor'));
  const beginTour = (key: string) => { setActiveTour(key); setTourStep(0); void update(key, 'tour', 'started'); onNavigate(tours[key].steps[0].view); };
  if (loading) return <div className="min-h-72 flex items-center justify-center text-xs text-gray-500"><LoaderCircle className="w-5 h-5 animate-spin mr-2" />Loading your learning plan...</div>;
  return <div className="space-y-5">
    <header className="bg-brand-charcoal text-white rounded-lg p-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5"><div><p className="text-[10px] font-mono uppercase text-brand-sage">Help and Learning</p><h1 className="text-2xl font-black mt-1">Learn while you build the inventory</h1><p className="text-sm text-gray-300 mt-2 max-w-2xl">Role-aware tasks, guided workflows and concise answers tied to the product you are using.</p></div><div className="min-w-56"><div className="flex justify-between text-[10px] font-mono"><span>CORE SETUP</span><span>{completed}/{relevant.length}</span></div><div className="h-2 bg-white/10 mt-2"><div className="h-full bg-brand-sage" style={{ width: `${relevant.length ? completed / relevant.length * 100 : 0}%` }} /></div></div></header>
    <section className="bg-white border border-brand-border rounded-lg"><div className="p-5 border-b border-brand-border"><h2 className="text-sm font-black">Your implementation checklist</h2><p className="text-xs text-gray-500 mt-1">Completion is calculated from live records. Manual review steps are explicitly marked.</p></div><div className="divide-y divide-brand-border">{relevant.map((task) => { const done = isTaskComplete(task, summary); return <div key={task.key} className="p-4 flex gap-3 items-start"><div className={`mt-0.5 ${done ? 'text-brand-forest' : 'text-gray-300'}`}>{done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}</div><div className="flex-1 min-w-0"><p className="text-xs font-bold">{task.title}{task.manual && <span className="ml-2 text-[8px] font-mono bg-brand-offwhite px-1.5 py-0.5">MANUAL REVIEW</span>}</p><p className="text-xs text-gray-500 mt-1">{task.description}</p></div>{!done && <button onClick={() => { if (task.manual) void update(task.key,'task'); onNavigate(task.view); }} className="studio-secondary shrink-0">Open <ChevronRight className="w-3.5 h-3.5" /></button>}</div>; })}</div></section>
    <section><div className="flex items-center gap-2 mb-3"><Play className="w-4 h-4 text-brand-forest" /><h2 className="text-sm font-black">Guided walkthroughs</h2></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{visibleTours.map(([key, tour]) => { const done = summary?.progress.some((item) => item.item_key === key && item.status === 'completed'); return <button key={key} onClick={() => beginTour(key)} className="bg-white border border-brand-border rounded-lg p-4 text-left hover:border-brand-forest"><div className="flex justify-between"><GraduationCap className="w-5 h-5 text-brand-forest" />{done && <Check className="w-4 h-4 text-brand-forest" />}</div><h3 className="text-sm font-black mt-3">{tour.title}</h3><p className="text-xs text-gray-500 mt-1">{tour.description}</p><p className="text-[10px] font-mono text-brand-forest mt-3">{tour.steps.length} STEPS</p></button>; })}</div></section>
    <section className="bg-white border border-brand-border rounded-lg p-5"><div className="flex flex-col lg:flex-row lg:items-end gap-3"><div className="flex-1"><h2 className="text-sm font-black">Learning library</h2><p className="text-xs text-gray-500 mt-1">Search by task, concept or error.</p></div><div className="relative lg:w-80"><Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guides..." className="studio-input pl-9" /></div></div><div className="flex gap-1.5 mt-4 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`px-3 py-1.5 text-[10px] font-bold rounded whitespace-nowrap ${category === item ? 'bg-brand-charcoal text-white' : 'bg-brand-offwhite text-gray-600'}`}>{item}</button>)}</div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">{filtered.map((guide) => <article key={guide.id} className="border border-brand-border rounded p-4"><p className="text-[9px] uppercase font-mono text-brand-forest">{guide.category}</p><h3 className="text-sm font-black mt-1">{guide.title}</h3><p className="text-xs text-gray-600 mt-2 leading-relaxed">{guide.text}</p></article>)}</div>{!filtered.length && <p className="text-sm text-gray-500 py-12 text-center">No guide matches that search.</p>}</section>
    {activeTour && <TourCoach tourKey={activeTour} step={tourStep} onNavigate={onNavigate} onStep={setTourStep} onClose={() => setActiveTour('')} onComplete={async () => { await update(activeTour,'tour','completed'); setActiveTour(''); }} />}
  </div>;
}

function TourCoach({ tourKey, step, onNavigate, onStep, onClose, onComplete }: { tourKey: string; step: number; onNavigate: (view: ViewState) => void; onStep: (value: number) => void; onClose: () => void; onComplete: () => void }) {
  const tour = tours[tourKey], current = tour.steps[step], last = step === tour.steps.length - 1;
  return <aside className="fixed right-5 bottom-5 z-[250] w-[360px] max-w-[calc(100vw-2.5rem)] bg-white border border-brand-border rounded-lg shadow-2xl overflow-hidden" aria-live="polite"><div className="bg-brand-charcoal text-white px-4 py-3 flex justify-between"><div><p className="text-[9px] font-mono text-brand-sage">{tour.title.toUpperCase()} | {step + 1}/{tour.steps.length}</p><h3 className="text-sm font-black mt-1">{current.title}</h3></div><button title="Close walkthrough" onClick={onClose}><X className="w-4 h-4" /></button></div><div className="p-4"><p className="text-xs text-gray-600 leading-relaxed">{current.body}</p><button onClick={() => onNavigate(current.view)} className="mt-3 text-xs font-bold text-brand-forest flex items-center gap-1"><Compass className="w-3.5 h-3.5" />Open this workspace</button><div className="flex justify-between gap-2 mt-5"><button disabled={step === 0} onClick={() => onStep(step - 1)} className="studio-secondary">Back</button><button onClick={() => { if (last) void onComplete(); else { const next = step + 1; onStep(next); onNavigate(tour.steps[next].view); } }} className="studio-primary">{last ? 'Complete tour' : 'Next'} <ArrowRight className="w-3.5 h-3.5" /></button></div></div></aside>;
}

const contextHelp: Partial<Record<ViewState, { title: string; purpose: string; checks: string[] }>> = {
  'dashboard-overview': { title: 'Command Center', purpose: 'Review boundaries, data quality, scopes, sources and facility performance before drawing conclusions.', checks: ['Resolve missing-data warnings first', 'Compare like-for-like reporting periods', 'Check production coverage before using intensity'] },
  'dashboard-facilities': { title: 'Facilities', purpose: 'Define the operational boundaries to which activity, production, evidence and targets belong.', checks: ['Use one stable facility record per plant', 'Confirm location and operating status', 'Archive rather than duplicate historical facilities'] },
  'dashboard-energy': { title: 'Energy and production ledgers', purpose: 'Store auditable activity quantities with units, periods, factors and evidence.', checks: ['Enter the source-document unit', 'Use the correct facility and date', 'Add production for meaningful intensity'] },
  'dashboard-data-platform': { title: 'Enterprise Data Hub', purpose: 'Validate external data before it enters operational ledgers.', checks: ['Map a real registered facility ID', 'Resolve invalid units and duplicates', 'Approve and Post are separate actions'] },
  'dashboard-collaboration': { title: 'Collaboration Center', purpose: 'Coordinate assigned work, reviews, evidence, approvals and notifications with an organisation-scoped audit trail.', checks: ['Assign work to an active member', 'Attach evidence before accepting a request', 'Run escalations after reviewing overdue deadlines'] },
  'dashboard-public-portal': { title: 'Public ESG Portal', purpose: 'Publish an explicit, versioned external snapshot without exposing live tenant ledgers or private evidence.', checks: ['Review every enabled section', 'Select only stakeholder-ready resource metadata', 'Withdraw and republish when a public correction is required'] },
  'dashboard-documents': { title: 'Evidence Vault', purpose: 'Keep source documents available for calculations, disclosures and auditor review.', checks: ['Use descriptive document names', 'Set period and facility correctly', 'Check extraction status before AI retrieval'] },
  'dashboard-intelligence': { title: 'Carbon Intelligence', purpose: 'Investigate hotspots and test transparent reduction scenarios against immutable baselines.', checks: ['Treat findings as diagnostic signals', 'Do not call scenarios forecasts', 'Assign owners and measurable project targets'] },
  'dashboard-analytics': { title: 'Analytics Studio', purpose: 'Build governed KPI views from current calculation lineage with filters, cross-filtering and drill-through.', checks: ['Check filter boundaries before comparing periods', 'Treat projections as transparent trend extensions', 'Inspect calculation rows behind surprising values'] },
  'dashboard-sustainability': { title: 'Sustainability Planner', purpose: 'Prioritize reduction, targets, resources and transition pathways from recorded data and explicit assumptions.', checks: ['Separate investigations from quantified projects', 'Review MACC lifetime and cost assumptions', 'Treat credits only as a residual-emissions consideration'] },
  'dashboard-reports': { title: 'ESG Reporting Studio', purpose: 'Compose evidence-backed reports through controlled review, approval and publication.', checks: ['Link evidence to material claims', 'Review AI drafts and citations', 'Create a version before submission'] },
  'dashboard-ai-assistant': { title: 'Carbon Copilot', purpose: 'Ask questions about recorded tenant data and evidence without changing ledgers.', checks: ['Verify every citation', 'Treat responses as advisory', 'Use operational screens for all mutations'] },
};

export function ContextHelpDrawer({ view, open, onClose, onOpenLearning }: { view: ViewState; open: boolean; onClose: () => void; onOpenLearning: () => void }) {
  if (!open) return null; const help = contextHelp[view] ?? { title: 'Balancing Carbon', purpose: 'Use the Learning Centre for role-based workflows, product guidance and carbon-accounting concepts.', checks: ['Follow the implementation checklist', 'Use contextual source and unit labels', 'Ask an administrator when a control is unavailable'] };
  return <div className="fixed inset-0 z-[280] bg-black/20 flex justify-end" onClick={onClose}><aside className="w-[390px] max-w-[92vw] h-full bg-white border-l border-brand-border shadow-xl p-5" onClick={(event) => event.stopPropagation()}><div className="flex justify-between"><div><p className="text-[10px] uppercase font-mono text-brand-forest">Contextual help</p><h2 className="text-xl font-black mt-1">{help.title}</h2></div><button title="Close help" onClick={onClose} className="studio-mini"><X /></button></div><p className="text-sm text-gray-600 leading-relaxed mt-4">{help.purpose}</p><div className="mt-6"><h3 className="text-xs font-black">Before you continue</h3><div className="mt-2 space-y-2">{help.checks.map((check) => <p key={check} className="text-xs text-gray-600 flex gap-2"><ShieldCheck className="w-4 h-4 text-brand-forest shrink-0" />{check}</p>)}</div></div><button onClick={onOpenLearning} className="studio-primary w-full mt-8"><BookOpen className="w-4 h-4" />Open Learning Centre</button><div className="mt-6 bg-brand-offwhite border border-brand-border p-4 rounded"><p className="text-[10px] uppercase font-mono text-brand-forest flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />Need an answer about your data?</p><p className="text-xs text-gray-600 mt-2">Carbon Copilot can explain recorded emissions, evidence, facilities and reports. It remains read-only.</p></div></aside></div>;
}
