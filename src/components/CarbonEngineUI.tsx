import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileClock,
  FileText,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';

import { sourcesForScope, type CarbonCalculationMethod, type CarbonScope, type CarbonSourceDefinition } from '../../shared/carbonActivityCatalog.ts';
import { ensureFreshSession, getAuthenticatedHeaders } from '../services/apiClient.ts';
import type { EnergyRecord, Facility, ViewState } from '../types.ts';

type EngineScope = CarbonScope | 'all';

interface CarbonEngineProps {
  scopeType: EngineScope;
  facilities: Facility[];
  records?: EnergyRecord[];
  onNavigate?: (view: ViewState) => void;
  publicMode?: boolean;
  onRegister?: () => void;
}

interface RegistryFactor {
  id: string;
  sourceType: string;
  scope: CarbonScope;
  factorValue: number;
  factorUnit: string;
  activityUnit: string;
  country: string;
  region: string;
  sourceName: string;
  sourceReference: string;
  version: string;
  effectiveFrom: string;
  qualityRating: string;
  approvalStatus: string;
  isCustom: boolean;
  sourceCatalogId: string;
}

interface EngineForm {
  facilityId: string;
  sourceId: string;
  factorId: string;
  method: CarbonCalculationMethod;
  quantity: string;
  unit: string;
  activityDate: string;
  reportingPeriod: string;
  evidenceReference: string;
  supplier: string;
  invoiceNumber: string;
  notes: string;
  beginningInventory: string;
  purchases: string;
  endingInventory: string;
  recoveredOrReturned: string;
  distance: string;
  fuelEfficiency: string;
}

const today = new Date().toISOString().slice(0, 10);

function blankForm(scope: CarbonScope, facilities: Facility[]): EngineForm {
  const source = sourcesForScope(scope)[0];
  const facility = facilities[0];
  return {
    facilityId: facility?.id ?? '',
    sourceId: source?.id ?? '',
    factorId: '',
    method: source?.defaultMethod ?? 'activity-factor',
    quantity: '',
    unit: source?.units[0] ?? '',
    activityDate: today,
    reportingPeriod: facility?.reportingPeriod ?? String(new Date().getFullYear()),
    evidenceReference: '',
    supplier: '',
    invoiceNumber: '',
    notes: '',
    beginningInventory: '',
    purchases: '',
    endingInventory: '',
    recoveredOrReturned: '',
    distance: '',
    fuelEfficiency: '',
  };
}

async function engineRequest(path: string, options?: RequestInit, authenticated = true) {
  if (authenticated) await ensureFreshSession();
  const response = await fetch(path, {
    ...options,
    headers: { ...(authenticated ? getAuthenticatedHeaders(options?.headers) : options?.headers), 'Content-Type': 'application/json' },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The carbon engine request failed.');
  return payload;
}

function recordEmissions(activity: any) {
  const calculations = Array.isArray(activity?.calculation_records) ? activity.calculation_records : [];
  const current = calculations.find((item: any) => item.status === 'current') ?? calculations[0];
  return Number(current?.emissions_t_co2e ?? 0);
}

function displayMethod(method: string) {
  return method.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ');
}

function normalizedSourceName(value: string) {
  return value.toLowerCase().replace(/^mobile\s+/, '').trim();
}

function factorMatchesSource(source: CarbonSourceDefinition, factor: RegistryFactor) {
  if (factor.sourceCatalogId) return factor.sourceCatalogId === source.id;
  return normalizedSourceName(factor.sourceType) === normalizedSourceName(source.name);
}

function matchingFactor(source: CarbonSourceDefinition | undefined, factors: RegistryFactor[]) {
  if (!source) return null;
  return factors.find((factor) => factorMatchesSource(source, factor)) ?? null;
}

export default function CarbonEngineUI({ scopeType, facilities, records = [], onNavigate, publicMode = false, onRegister }: CarbonEngineProps) {
  const initialScope = scopeType === 'all' ? 'scope-1' : scopeType;
  const [activeScope, setActiveScope] = useState<CarbonScope>(initialScope);
  const [form, setForm] = useState<EngineForm>(() => blankForm(initialScope, facilities));
  const [factors, setFactors] = useState<RegistryFactor[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [draftId, setDraftId] = useState('');

  const sources = useMemo(() => sourcesForScope(activeScope), [activeScope]);
  const selectedSource = sources.find((source) => source.id === form.sourceId) ?? sources[0];
  const compatibleFactors = selectedSource ? factors.filter((factor) => factorMatchesSource(selectedSource, factor)) : [];
  const selectedFactor = compatibleFactors.find((factor) => factor.id === form.factorId) ?? null;
  const scopedActivities = activities.filter((activity) => activity.scope === activeScope);
  const scopeTotal = scopedActivities.reduce((total, activity) => total + recordEmissions(activity), 0);

  const updateForm = (field: keyof EngineForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setPreview(null);
    setError('');
    setMessage('');
  };

  useEffect(() => {
    if (scopeType !== 'all') setActiveScope(scopeType);
  }, [scopeType]);

  useEffect(() => {
    const next = blankForm(activeScope, facilities);
    const storageKey = `${publicMode ? 'public-' : ''}balancing-carbon-engine-${activeScope}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try { setForm({ ...next, ...JSON.parse(stored) }); }
      catch { setForm(next); }
    } else setForm(next);
    setPreview(null);
    setDraftId('');
  }, [activeScope, facilities, publicMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => localStorage.setItem(`${publicMode ? 'public-' : ''}balancing-carbon-engine-${activeScope}`, JSON.stringify(form)), 500);
    return () => window.clearTimeout(timer);
  }, [activeScope, form, publicMode]);

  useEffect(() => {
    let cancelled = false;
    const requests = publicMode
      ? Promise.all([engineRequest(`/api/public/carbon-engine/factors?scope=${activeScope}`, { cache: 'no-store' }, false), Promise.resolve({ activities: [] })])
      : Promise.all([engineRequest(`/api/carbon-engine/factors?scope=${activeScope}`, { cache: 'no-store' }), engineRequest('/api/carbon-activities')]);
    requests.then(([factorPayload, activityPayload]) => {
      if (cancelled) return;
      const loadedFactors = factorPayload.factors ?? [];
      setFactors(loadedFactors);
      setActivities(activityPayload.activities ?? []);
      setForm((current) => {
        const currentSource = sourcesForScope(activeScope).find((source) => source.id === current.sourceId);
        if (currentSource && loadedFactors.some((factor: RegistryFactor) => factor.id === current.factorId && factorMatchesSource(currentSource, factor))) return current;
        const match = matchingFactor(currentSource, loadedFactors);
        return match ? { ...current, factorId: match.id, unit: match.activityUnit } : { ...current, factorId: '' };
      });
    }).catch((requestError) => !cancelled && setError(requestError.message));
    return () => { cancelled = true; };
  }, [activeScope, publicMode]);

  const changeSource = (sourceId: string) => {
    const source = sources.find((item) => item.id === sourceId);
    if (!source) return;
    const match = matchingFactor(source, factors);
    setForm((current) => ({ ...current, sourceId, method: source.defaultMethod, factorId: match?.id ?? '', quantity: '', unit: match?.activityUnit ?? source.units[0] ?? current.unit }));
    setPreview(null);
  };

  const changeFactor = (factorId: string) => {
    const factor = factors.find((item) => item.id === factorId);
    setForm((current) => ({ ...current, factorId, unit: factor?.activityUnit ?? current.unit }));
    setPreview(null);
  };

  const payload = () => ({ ...form, sourceId: selectedSource?.id, factorId: selectedFactor?.id });

  const calculate = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await engineRequest(publicMode ? '/api/public/carbon-engine/calculate' : '/api/carbon-engine/calculate', { method: 'POST', body: JSON.stringify(payload()) }, !publicMode);
      setPreview(result);
      setMessage('Calculation preview is ready. Review the factor lineage before submission.');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to calculate.'); }
    setBusy(false);
  };

  const saveDraft = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await engineRequest('/api/carbon-engine/drafts', { method: 'POST', body: JSON.stringify({ ...payload(), id: draftId || undefined, lastCalculation: preview?.calculation ?? {} }) });
      setDraftId(result.draft.id);
      setMessage('Draft saved to your organization workspace.');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to save draft.'); }
    setBusy(false);
  };

  const submit = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      await engineRequest('/api/carbon-engine/activities', { method: 'POST', body: JSON.stringify({ ...payload(), draftId: draftId || undefined }) });
      const refreshed = await engineRequest('/api/carbon-activities');
      setActivities(refreshed.activities ?? []);
      setMessage('Activity submitted to the governed carbon ledger.');
      setPreview(null); setDraftId('');
      localStorage.removeItem(`balancing-carbon-engine-${activeScope}`);
      setForm(blankForm(activeScope, facilities));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to submit activity.'); }
    setBusy(false);
  };

  const noRegistryFactors = compatibleFactors.length === 0;
  const scopeFallbackTotal = records.filter((record: any) => record.scope === activeScope).reduce((total, record) => total + Number(record.emissionsTCO2e ?? record.emissions ?? 0), 0);
  const displayedTotal = publicMode ? Number(preview?.calculation?.emissionsTCO2e ?? 0) : scopedActivities.length ? scopeTotal : scopeFallbackTotal;

  return (
    <div className="space-y-5 carbon-engine-workspace">
      <header className="bg-white border border-brand-border p-5 sm:p-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-brand-forest">{publicMode ? 'Free emissions calculator' : 'Governed carbon accounting'}</span>
            {publicMode
              ? <h2 className="text-2xl sm:text-3xl font-display font-semibold text-brand-charcoal mt-1">Scope 1, 2 and 3 calculator</h2>
              : <h1 className="text-2xl sm:text-3xl font-display font-semibold text-brand-charcoal mt-1">Carbon activity workspace</h1>}
            <p className="text-sm text-gray-500 mt-2 max-w-3xl">{publicMode ? 'Choose an emissions scope and approved public factor to calculate a transparent estimate. Nothing is written to a company ledger.' : 'Record operational and value-chain activity with a versioned factor, evidence reference and reproducible calculation lineage.'}</p>
          </div>
          <div className="carbon-engine-summary grid w-full grid-cols-2 gap-px border border-brand-border bg-brand-border sm:w-auto sm:min-w-[270px]">
            <div className="carbon-engine-dark-surface bg-brand-charcoal text-white p-3.5">
              <span className="text-[9px] font-mono uppercase text-brand-sage">{publicMode ? 'Current estimate' : 'Recorded footprint'}</span>
              <strong className="block text-xl mt-1">{displayedTotal.toLocaleString(undefined, { maximumFractionDigits: 3 })} <small className="text-xs font-normal">tCO2e</small></strong>
            </div>
            <div className="bg-white p-3.5">
              <span className="text-[9px] font-mono uppercase text-gray-400">{publicMode ? 'Selected scope' : 'Ledger records'}</span>
              <strong className="block text-xl mt-1 text-brand-charcoal">{publicMode ? activeScope.replace('-', ' ').replace('scope', 'Scope') : scopedActivities.length || records.filter((record: any) => record.scope === activeScope).length}</strong>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-5" role="tablist" aria-label="Emissions scope">
          {(['scope-1', 'scope-2', 'scope-3'] as CarbonScope[]).map((scope) => (
            <button key={scope} type="button" onClick={() => setActiveScope(scope)} className={`px-4 py-2 text-xs font-semibold border transition-colors ${activeScope === scope ? 'bg-brand-charcoal text-white border-brand-charcoal' : 'bg-white text-gray-600 border-brand-border hover:border-brand-forest'}`}>
              {scope.replace('-', ' ').replace('scope', 'Scope')}
            </button>
          ))}
        </div>
      </header>

      {(error || message) && <div className={`p-3.5 text-sm border flex items-start gap-2 ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-800'}`}>{error ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}<span>{error || message}</span></div>}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,.75fr)] gap-5 items-start">
        <section className="bg-white border border-brand-border">
          <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between gap-3">
            <div><h2 className="font-semibold text-brand-charcoal flex items-center gap-2"><Calculator className="w-4 h-4 text-brand-forest" /> Activity entry</h2><p className="text-xs text-gray-500 mt-1">Required fields are validated by the server before calculation.</p></div>
            <span className="text-[10px] font-mono text-brand-forest">AUTOSAVED LOCALLY</span>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="engine-field md:col-span-2"><span>GHG category and source</span><select value={form.sourceId} onChange={(event) => changeSource(event.target.value)}>{sources.map((source) => <option key={source.id} value={source.id}>{source.ghgCategory} - {source.name}</option>)}</select><small>{selectedSource?.description}</small></label>
            {!publicMode && <label className="engine-field"><span>Facility</span><select value={form.facilityId} onChange={(event) => updateForm('facilityId', event.target.value)}><option value="">Select facility</option>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}</select></label>}
            <label className="engine-field"><span>Activity date</span><input type="date" value={form.activityDate} onChange={(event) => updateForm('activityDate', event.target.value)} /></label>
            <label className="engine-field md:col-span-2"><span>Emission factor</span><select value={form.factorId} onChange={(event) => changeFactor(event.target.value)} disabled={noRegistryFactors}><option value="">{noRegistryFactors ? 'No approved factor mapped to this activity source' : 'Select an approved factor'}</option>{compatibleFactors.map((factor) => <option key={factor.id} value={factor.id}>{factor.sourceType} | {factor.factorValue} {factor.factorUnit} | {factor.sourceName} v{factor.version}</option>)}</select></label>
            <label className="engine-field"><span>Calculation method</span><select value={form.method} onChange={(event) => updateForm('method', event.target.value)}>{(['activity-factor', 'distance-factor', 'spend-factor', 'supplier-specific', 'refrigerant-balance', 'fuel-efficiency'] as CarbonCalculationMethod[]).map((method) => <option key={method} value={method}>{displayMethod(method)}</option>)}</select></label>
            <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
              <label className="engine-field"><span>Activity quantity</span><input type="number" min="0" step="any" value={form.quantity} onChange={(event) => updateForm('quantity', event.target.value)} placeholder="0.00" /></label>
              <label className="engine-field"><span>Unit</span><select value={form.unit} onChange={(event) => updateForm('unit', event.target.value)}>{Array.from(new Set([selectedFactor?.activityUnit, ...(selectedSource?.units ?? [])].filter(Boolean))).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
            </div>

            {form.method === 'refrigerant-balance' && <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-brand-offwhite border border-brand-border"><label className="engine-field"><span>Opening charge</span><input type="number" min="0" value={form.beginningInventory} onChange={(event) => updateForm('beginningInventory', event.target.value)} /></label><label className="engine-field"><span>Purchased</span><input type="number" min="0" value={form.purchases} onChange={(event) => updateForm('purchases', event.target.value)} /></label><label className="engine-field"><span>Closing charge</span><input type="number" min="0" value={form.endingInventory} onChange={(event) => updateForm('endingInventory', event.target.value)} /></label><label className="engine-field"><span>Recovered</span><input type="number" min="0" value={form.recoveredOrReturned} onChange={(event) => updateForm('recoveredOrReturned', event.target.value)} /></label></div>}
            {form.method === 'fuel-efficiency' && <div className="md:col-span-2 grid grid-cols-2 gap-3 p-4 bg-brand-offwhite border border-brand-border"><label className="engine-field"><span>Distance</span><input type="number" min="0" value={form.distance} onChange={(event) => updateForm('distance', event.target.value)} /></label><label className="engine-field"><span>Fuel efficiency</span><input type="number" min="0" value={form.fuelEfficiency} onChange={(event) => updateForm('fuelEfficiency', event.target.value)} /></label></div>}

            {!publicMode && <><label className="engine-field"><span>Supplier or counterparty</span><input value={form.supplier} onChange={(event) => updateForm('supplier', event.target.value)} placeholder="Optional" /></label><label className="engine-field"><span>Invoice or reference number</span><input value={form.invoiceNumber} onChange={(event) => updateForm('invoiceNumber', event.target.value)} placeholder="Optional" /></label><label className="engine-field md:col-span-2"><span>Evidence reference</span><input value={form.evidenceReference} onChange={(event) => updateForm('evidenceReference', event.target.value)} placeholder={selectedSource?.evidenceHint} /><small>Required to submit. Use a document ID, invoice name, meter export or controlled source reference.</small></label><label className="engine-field md:col-span-2"><span>Review notes</span><textarea rows={3} value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder="Boundary decisions, exclusions, assumptions or reviewer context" /></label></>}
          </div>
          <div className="px-5 py-4 border-t border-brand-border flex flex-col sm:flex-row gap-2 sm:justify-between">
            {publicMode ? <><p className="text-xs text-gray-500 self-center">Preview only. Sign in to save evidence and activity records.</p><button type="button" onClick={calculate} disabled={busy || !selectedFactor} className="engine-button engine-button-primary"><Calculator className="w-4 h-4" /> Calculate emissions</button></> : <><button type="button" onClick={saveDraft} disabled={busy || !selectedSource} className="engine-button engine-button-secondary"><Save className="w-4 h-4" /> Save draft</button><div className="flex flex-col sm:flex-row gap-2"><button type="button" onClick={calculate} disabled={busy || !selectedFactor} className="engine-button engine-button-secondary"><Calculator className="w-4 h-4" /> Calculate preview</button><button type="button" onClick={submit} disabled={busy || !preview || !form.evidenceReference} className="engine-button engine-button-primary"><Send className="w-4 h-4" /> Submit to ledger</button></div></>}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="carbon-engine-dark-surface bg-brand-charcoal text-white border border-brand-charcoal p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-brand-sage" /> Calculation assurance</h2>{preview && <span className="text-[10px] font-mono text-brand-sage">PREVIEW</span>}</div>
            {!preview ? <div className="py-10 text-center"><Database className="w-7 h-7 text-brand-sage mx-auto mb-3" /><p className="text-sm text-gray-300">Choose a registry factor and calculate to inspect the formula, source and version {publicMode ? 'behind the estimate.' : 'before saving.'}</p></div> : <div className="mt-5 space-y-4"><div><span className="text-[9px] font-mono uppercase text-brand-sage">Calculated emissions</span><strong className="block text-3xl mt-1">{Number(preview.calculation.emissionsTCO2e).toLocaleString(undefined, { maximumFractionDigits: 6 })} <small className="text-sm font-normal">tCO2e</small></strong></div><div className="border-t border-white/15 pt-4 text-xs space-y-2"><p><span className="text-gray-400">Formula:</span> {preview.calculation.formula}</p><p><span className="text-gray-400">Factor:</span> {preview.factor.factorValue} {preview.factor.factorUnit}</p><p><span className="text-gray-400">Source:</span> {preview.factor.sourceName}</p><p><span className="text-gray-400">Version:</span> {preview.factor.version}</p><p><span className="text-gray-400">Confidence:</span> {preview.calculation.confidenceScore}%</p></div>{preview.calculation.warnings?.map((warning: string) => <div key={warning} className="bg-amber-400/10 border border-amber-300/20 p-3 text-xs text-amber-100 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{warning}</div>)}</div>}
          </section>

          <section className="bg-white border border-brand-border p-5">
            <h2 className="font-semibold text-brand-charcoal flex items-center gap-2"><BookOpen className="w-4 h-4 text-brand-forest" /> Factor lineage</h2>
            {selectedFactor ? <dl className="mt-4 text-xs divide-y divide-brand-border"><div className="py-2.5 flex justify-between gap-3"><dt className="text-gray-500">Factor ID</dt><dd className="font-mono text-right break-all">{selectedFactor.id}</dd></div><div className="py-2.5 flex justify-between gap-3"><dt className="text-gray-500">Geography</dt><dd className="text-right">{[selectedFactor.country, selectedFactor.region].filter(Boolean).join(' / ')}</dd></div><div className="py-2.5 flex justify-between gap-3"><dt className="text-gray-500">Effective from</dt><dd>{selectedFactor.effectiveFrom || 'Not specified'}</dd></div><div className="py-2.5 flex justify-between gap-3"><dt className="text-gray-500">Quality</dt><dd>{selectedFactor.qualityRating}</dd></div></dl> : <p className="text-sm text-gray-500 mt-4">No approved factor is mapped to this activity source. Add an authoritative factor to the registry before recording emissions.</p>}
            {noRegistryFactors && !publicMode && onNavigate && <button type="button" className="mt-4 text-xs font-semibold text-brand-forest" onClick={() => onNavigate('dashboard-settings')}>Open system settings</button>}
          </section>
        </aside>
      </div>

      {publicMode ? <section className="bg-brand-sage/45 border border-brand-sage p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5"><div><h2 className="font-semibold text-brand-charcoal">Turn the estimate into a governed inventory</h2><p className="text-sm text-gray-600 mt-1 max-w-3xl">Register to save facility activity, attach evidence, use organisation-specific factors and build auditable Scope 1, 2 and 3 ledgers.</p></div><button type="button" onClick={onRegister} className="engine-button engine-button-primary shrink-0">Create free account</button></section> : <section className="bg-white border border-brand-border">
        <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between"><div><h2 className="font-semibold text-brand-charcoal flex items-center gap-2"><FileClock className="w-4 h-4 text-brand-forest" /> Recent ledger activity</h2><p className="text-xs text-gray-500 mt-1">Only stored activity and current calculation records appear here.</p></div><span className="text-[10px] font-mono text-gray-400">{activeScope.toUpperCase()}</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead className="bg-brand-offwhite text-left text-[10px] font-mono uppercase text-gray-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">GHG category</th><th className="px-5 py-3">Activity</th><th className="px-5 py-3">Emissions</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-brand-border">{scopedActivities.slice(0, 8).map((activity) => <tr key={activity.id}><td className="px-5 py-3 text-gray-600">{activity.activity_date}</td><td className="px-5 py-3 font-medium text-brand-charcoal">{activity.source_type}</td><td className="px-5 py-3 text-gray-600">{activity.ghg_category || activity.activity_category}</td><td className="px-5 py-3 font-mono text-xs">{Number(activity.quantity).toLocaleString()} {activity.unit}</td><td className="px-5 py-3 font-semibold">{recordEmissions(activity).toLocaleString(undefined, { maximumFractionDigits: 5 })} tCO2e</td><td className="px-5 py-3"><span className="inline-flex items-center gap-1 text-xs text-brand-forest"><ClipboardCheck className="w-3.5 h-3.5" /> {activity.verification_status}</span></td></tr>)}{!scopedActivities.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-500"><FileText className="w-6 h-6 mx-auto mb-2 text-gray-300" />No governed {activeScope.replace('-', ' ')} activity has been recorded yet.</td></tr>}</tbody></table></div>
      </section>}
    </div>
  );
}
