import { useEffect, useState } from 'react';

type PublicUnit = { id: string; code: string; name: string; symbol: string; category_id: string };
type Category = 'energy' | 'mass' | 'volume' | 'water' | 'distance' | 'time' | 'carbon' | 'power' | 'count' | 'ratio';
type UnitDefinition = { category: Category; baseUnit: string };

const categoryIds: Record<Category, string> = { energy: 'unitcat-energy', mass: 'unitcat-mass', volume: 'unitcat-volume', water: 'unitcat-water', distance: 'unitcat-distance', time: 'unitcat-time', carbon: 'unitcat-carbon', power: 'unitcat-power', count: 'unitcat-count', ratio: 'unitcat-ratio' };

/** Maps legacy public calculator labels to registry units; conversion factors remain server-side registry data. */
function resolveDefinition(unit: string): UnitDefinition | null {
  const normalized = unit.trim().toLowerCase();
  if (normalized.includes('tco2e/') || normalized.includes('lakhs inr')) return null;
  if (normalized.includes('tco2e')) return { category: 'carbon', baseUnit: 'tCO2e' };
  if (normalized.includes('kwh')) return { category: 'energy', baseUnit: 'kWh' };
  if (normalized.includes('mwh')) return { category: 'energy', baseUnit: 'MWh' };
  if (normalized.includes('gigajoule') || normalized === 'gj') return { category: 'energy', baseUnit: 'GJ' };
  if (normalized.includes('kva')) return { category: 'power', baseUnit: 'kVA' };
  if (normalized === 'pue') return { category: 'ratio', baseUnit: 'PUE' };
  if (normalized.includes('kilolitre') || normalized === 'kl') return { category: 'water', baseUnit: 'water-kL' };
  if (normalized.includes('litre') || normalized === 'l') return { category: 'volume', baseUnit: 'litre' };
  if (normalized.includes('scm')) return { category: 'volume', baseUnit: 'SCM' };
  if (normalized.includes('ton') || normalized === 'kg') return { category: 'mass', baseUnit: normalized === 'kg' ? 'kg' : 'tonne' };
  if (normalized.includes('second')) return { category: 'time', baseUnit: 'second' };
  if (normalized.includes('day')) return { category: 'time', baseUnit: 'day' };
  if (normalized === 'km' || normalized.includes('distance')) return { category: 'distance', baseUnit: 'km' };
  if (normalized.includes('%')) return { category: 'ratio', baseUnit: 'percent' };
  if (normalized.includes('cos') || normalized.includes('power factor')) return { category: 'ratio', baseUnit: 'power-factor' };
  if (normalized.includes('incident')) return { category: 'count', baseUnit: 'incident' };
  if (normalized.includes('supplier')) return { category: 'count', baseUnit: 'supplier' };
  if (normalized.includes('plant')) return { category: 'count', baseUnit: 'plant' };
  if (normalized.includes('meter')) return { category: 'count', baseUnit: 'meter-count' };
  if (normalized.includes('employee') || normalized.includes('person') || normalized.includes('people')) return { category: 'count', baseUnit: 'person' };
  return null;
}

export default function RegistryUnitInput({ id, label, unit, value, onChange }: { id: string; label: string; unit?: string; value: number; onChange: (value: number) => void }) {
  const definition = unit ? resolveDefinition(unit) : null;
  const [units, setUnits] = useState<PublicUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState(definition?.baseUnit ?? unit ?? '');
  const [displayValue, setDisplayValue] = useState(String(value));
  const [unitLoadError, setUnitLoadError] = useState('');
  useEffect(() => { setSelectedUnit(definition?.baseUnit ?? unit ?? ''); }, [definition?.baseUnit, unit]);
  useEffect(() => {
    if (!definition) return;
    void fetch(`/api/public/units?category=${definition.category}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Unit registry request failed (${response.status})`);
        return response.json();
      })
      .then((data) => {
        const loadedUnits = data?.units ?? [];
        setUnits(loadedUnits);
        setUnitLoadError(loadedUnits.length ? '' : 'No compatible units are available from the registry.');
      })
      .catch(() => {
        setUnits([]);
        setUnitLoadError('Unit choices are unavailable. Restart the local server and refresh this page.');
      });
  }, [definition?.category]);
  const convert = async (amount: number, fromUnit: string, toUnit: string) => { const response = await fetch('/api/public/units/convert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: amount, fromUnit, toUnit }) }); if (!response.ok) throw new Error('Unit conversion failed.'); return response.json(); };
  useEffect(() => { let active = true; if (!definition) { setDisplayValue(String(value)); return () => { active = false; }; } void convert(value, definition.baseUnit, selectedUnit).then((result) => { if (active) setDisplayValue(String(result.displayValue)); }).catch(() => { if (active) setDisplayValue(String(value)); }); return () => { active = false; }; }, [value, definition?.baseUnit, selectedUnit]);
  const changeValue = (next: string) => { setDisplayValue(next); const number = Number(next); if (!Number.isFinite(number) || number < 0 || !definition) return; void convert(number, selectedUnit, definition.baseUnit).then((result) => onChange(Number(result.displayValue))).catch(() => undefined); };
  return <div className="space-y-1.5"><label htmlFor={id} className="block text-xs font-bold text-slate-700">{label}</label><div className="flex rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm"><input type="number" id={id} min={0} value={displayValue} onChange={(event) => changeValue(event.target.value)} className="min-w-0 flex-1 px-4 py-3 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900" />{definition ? <select value={selectedUnit} onChange={(event) => setSelectedUnit(event.target.value)} className="border-l border-slate-200 bg-emerald-50 px-2 text-[10px] font-bold text-emerald-800 outline-none min-w-24">{units.length ? units.map((item) => <option key={item.id} value={item.code}>{item.symbol || item.code}</option>) : <option value={selectedUnit}>{selectedUnit}</option>}</select> : <span className="flex items-center bg-slate-100 px-3 text-[10px] font-bold text-slate-400 uppercase">{unit || 'value'}</span>}</div>{unitLoadError ? <p className="text-xs text-amber-700">{unitLoadError}</p> : null}</div>;
}
