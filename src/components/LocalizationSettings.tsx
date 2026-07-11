import { Globe2, Languages, Ruler, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { safeFetchJson } from '../services/apiClient.ts';

type CatalogItem = { id: string; code: string; name: string; symbol?: string };
type Unit = { id: string; code: string; name: string; symbol: string; category_id: string; measurement_system: string };
type UnitPreference = { categoryId: string; category: string; categoryName: string; unitId: string; unitCode: string; unitName: string; displayMode: 'auto' | 'fixed' };

export default function LocalizationSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [catalog, setCatalog] = useState<Record<string, CatalogItem[]>>({});
  const [units, setUnits] = useState<Unit[]>([]);
  const [preferences, setPreferences] = useState<UnitPreference[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { void Promise.all([safeFetchJson('/api/localization', undefined, null), safeFetchJson('/api/units', undefined, { units: [] })]).then(([data, unitData]) => { if (!data?.localization) return; setSettings(data.localization); setCatalog(data.catalog ?? {}); setPreferences(data.localization.units ?? []); setUnits(unitData?.units ?? []); }); }, []);

  const preview = useMemo(() => {
    if (!settings) return { number: '', currency: '', date: '' };
    try {
      return { number: new Intl.NumberFormat(settings.numberFormat, { maximumFractionDigits: Number(settings.decimalPrecision) }).format(1234567.891), currency: new Intl.NumberFormat(settings.numberFormat, { style: 'currency', currency: settings.currencyCode, maximumFractionDigits: Number(settings.decimalPrecision) }).format(14818.7), date: new Intl.DateTimeFormat(settings.numberFormat, { dateStyle: 'medium', timeZone: settings.timeZone }).format(new Date('2026-07-11T12:00:00Z')) };
    } catch { return { number: '1,234,567.89', currency: `${settings.currencyCode} 14,818.70`, date: '11 Jul 2026' }; }
  }, [settings]);

  const updatePreference = (categoryId: string, unitId: string) => setPreferences((current) => current.map((item) => item.categoryId === categoryId ? { ...item, unitId, unitCode: units.find((unit) => unit.id === unitId)?.code ?? item.unitCode } : item));
  const save = async () => {
    if (!settings || busy) return; setBusy(true); setMessage('');
    const result = await safeFetchJson('/api/localization', { method: 'PUT', body: JSON.stringify({ ...settings, units: preferences.map((item) => ({ categoryId: item.categoryId, unitId: item.unitId, displayMode: item.displayMode })) }) }, null);
    if (result?.localization) { setSettings(result.localization); setPreferences(result.localization.units ?? preferences); setMessage('Localization and unit preferences saved. Existing stored quantities were not changed.'); }
    else setMessage('Unable to save localization preferences. Organization administrator access is required.');
    setBusy(false);
  };

  if (!settings) return <section className="bg-white border border-brand-border p-6 text-xs font-mono text-gray-400">Loading localization preferences...</section>;
  const field = (label: string, key: string, values: CatalogItem[]) => <label className="block text-xs font-mono text-gray-500">{label}<select className="mt-1.5 w-full border border-brand-border rounded p-2.5 bg-white text-sm" value={settings[key] ?? ''} onChange={(event) => setSettings({ ...settings, [key]: event.target.value })}>{values.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}</select></label>;
  return <section className="bg-white border border-brand-border p-6 space-y-5">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4"><div><div className="flex items-center gap-2"><Globe2 className="w-4 h-4 text-brand-forest" /><h2 className="font-black">Localization and measurement</h2></div><p className="text-xs text-gray-500 mt-1 max-w-2xl">Preferences change the language, format, report context, and display units. Canonical records and calculation lineage remain unchanged.</p></div><button onClick={save} disabled={busy} className="bg-brand-forest hover:bg-brand-green-sec text-white rounded px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"><Save className="w-4 h-4" />Save preferences</button></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{field('Language', 'languageCode', catalog.languages ?? [])}{field('Country', 'countryCode', catalog.countries ?? [])}{field('Currency', 'currencyCode', catalog.currencies ?? [])}{field('Time zone', 'timeZone', catalog.timeZones ?? [])}</div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><label className="block text-xs font-mono text-gray-500">Measurement system<select className="mt-1.5 w-full border border-brand-border rounded p-2.5 bg-white text-sm" value={settings.measurementSystem} onChange={(event) => setSettings({ ...settings, measurementSystem: event.target.value })}><option value="metric">Metric</option><option value="imperial">Imperial</option><option value="hybrid">Hybrid</option></select></label>{field('Reporting standard', 'reportingStandardCode', catalog.reportingStandards ?? [])}<label className="block text-xs font-mono text-gray-500">Number format<input className="mt-1.5 w-full border border-brand-border rounded p-2.5 text-sm" value={settings.numberFormat} onChange={(event) => setSettings({ ...settings, numberFormat: event.target.value })} /></label><label className="block text-xs font-mono text-gray-500">Decimal precision<input type="number" min="0" max="8" className="mt-1.5 w-full border border-brand-border rounded p-2.5 text-sm" value={settings.decimalPrecision} onChange={(event) => setSettings({ ...settings, decimalPrecision: Number(event.target.value) })} /></label></div>
    <div className="border-y border-brand-border py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"><div><p className="text-[10px] uppercase font-mono text-gray-400">Number preview</p><p className="mt-1 font-bold text-brand-charcoal">{preview.number}</p></div><div><p className="text-[10px] uppercase font-mono text-gray-400">Currency preview</p><p className="mt-1 font-bold text-brand-charcoal">{preview.currency}</p></div><div><p className="text-[10px] uppercase font-mono text-gray-400">Date preview</p><p className="mt-1 font-bold text-brand-charcoal">{preview.date}</p></div></div>
    <div><div className="flex items-center gap-2"><Ruler className="w-4 h-4 text-brand-forest" /><h3 className="text-sm font-black">Preferred display units</h3></div><p className="text-xs text-gray-500 mt-1">Auto chooses a readable unit; fixed preserves the selected unit in dashboards and reports.</p><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">{preferences.filter((item) => ['energy', 'carbon', 'production', 'mass', 'distance', 'water'].includes(item.category)).map((item) => <div key={item.categoryId} className="border border-brand-border rounded p-3"><p className="text-xs font-bold">{item.categoryName}</p><div className="grid grid-cols-[minmax(0,1fr)_86px] gap-2 mt-2"><select value={item.unitId} onChange={(event) => updatePreference(item.categoryId, event.target.value)} className="border border-brand-border rounded p-2 text-xs bg-white">{units.filter((unit) => unit.category_id === item.categoryId).map((unit) => <option key={unit.id} value={unit.id}>{unit.symbol || unit.code} - {unit.name}</option>)}</select><select value={item.displayMode} onChange={(event) => setPreferences((current) => current.map((value) => value.categoryId === item.categoryId ? { ...value, displayMode: event.target.value as 'auto' | 'fixed' } : value))} className="border border-brand-border rounded p-2 text-xs bg-white"><option value="auto">Auto</option><option value="fixed">Fixed</option></select></div></div>)}</div></div>
    {message && <p className="text-xs border border-brand-border bg-brand-offwhite p-3 flex items-center gap-2"><Languages className="w-4 h-4 text-brand-forest" />{message}</p>}
  </section>;
}
