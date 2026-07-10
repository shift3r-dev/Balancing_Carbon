import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Check,
  Download,
  Factory,
  FileCheck2,
  Flame,
  HelpCircle,
  Scale,
  ShieldCheck,
  Truck,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type SectorId = 'steel' | 'cement' | 'aluminum' | 'chemicals' | 'textiles' | 'logistics' | 'services';
type LogisticsMode = 'road' | 'rail' | 'sea';

interface PublicCarbonCalculatorProps {
  onRegister: () => void;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaButtonLabel?: string;
}

const factors = {
  gridKgPerKwh: 0.716,
  gridTPerMwh: 0.716,
  dieselTPerLitre: 0.00268,
  coalTPerTonne: 2.42,
  gasTPerScm: 0.00202,
};

const sectorTabs: { id: SectorId; label: string; icon: React.ElementType }[] = [
  { id: 'steel', label: 'Iron & Steel', icon: Flame },
  { id: 'cement', label: 'Cement', icon: Factory },
  { id: 'aluminum', label: 'Aluminum', icon: Zap },
  { id: 'chemicals', label: 'Chemicals', icon: Scale },
  { id: 'textiles', label: 'Textiles', icon: FileCheck2 },
  { id: 'logistics', label: 'Logistics', icon: Truck },
  { id: 'services', label: 'Services & IT', icon: BookOpen },
];

const initialInputs = {
  steelCoal: 500,
  steelLimestone: 120,
  steelElectricity: 1500,
  steelProduction: 1000,
  cementCoal: 1200,
  cementClinker: 2500,
  cementBypassDust: 15,
  cementProduction: 3200,
  aluminumAnode: 450,
  aluminumElectricity: 8500,
  aluminumProduction: 500,
  aluminumCaptivePower: false,
  chemGasFlared: 80000,
  chemN2O: 2.5,
  chemProduction: 1200,
  textileYarnWeight: 50000,
  textileElectricity: 350000,
  textileDiesel: 12000,
  logisticsWeight: 150,
  logisticsDistance: 1200,
  logisticsMode: 'road' as LogisticsMode,
  serviceITEnergy: 450,
  servicePUE: 1.6,
  serviceEmployees: 1200,
  serviceCommuteDays: 220,
  serviceCommuteAvgDistance: 15,
};

const evidenceDocs = [
  '12-month grid utility electricity invoices',
  'Fuel purchase invoices and generator running logs',
  'Coal or furnace fuel weighbridge slips',
  'Production output register by reporting period',
  'Bill of materials with material weights',
  'Supplier material carbon disclosures',
  'Freight shipment bills and route distance records',
  'Meter calibration or sub-meter screenshots',
  'Wastewater, hazardous waste, or chemical inventory logs',
  'Management-approved ESG or energy policy',
];

const formatNumber = (value: number, digits = 2) =>
  value.toLocaleString('en-US', { maximumFractionDigits: digits });

export default function PublicCarbonCalculator({
  onRegister,
  ctaTitle = 'Move From Sandbox To Ledger',
  ctaDescription = 'The public calculator is useful for learning and quick estimates. The secure tenant dashboard stores each electricity, fuel, steam, heat, production, document, and factor record with audit trails.',
  ctaButtonLabel = 'Register Tenant Workspace',
}: PublicCarbonCalculatorProps) {
  const [activeSector, setActiveSector] = useState<SectorId>('steel');
  const [inputs, setInputs] = useState(initialInputs);
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({
    [evidenceDocs[0]]: true,
    [evidenceDocs[3]]: true,
  });
  const [downloaded, setDownloaded] = useState(false);

  const setNumber = (key: keyof typeof initialInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: Math.max(0, Number(value) || 0) }));
  };

  const result = useMemo(() => {
    let scope1 = 0;
    let scope2 = 0;
    let scope3 = 0;
    let intensity = 0;
    let intensityUnit = '';
    let formulaLines: string[] = [];

    if (activeSector === 'steel') {
      const coal = inputs.steelCoal * factors.coalTPerTonne;
      const limestone = inputs.steelLimestone * 0.44;
      scope1 = coal + limestone;
      scope2 = inputs.steelElectricity * factors.gridTPerMwh;
      scope3 = inputs.steelCoal * 0.15 + inputs.steelProduction * 0.25;
      intensity = inputs.steelProduction > 0 ? (scope1 + scope2 + scope3) / inputs.steelProduction : 0;
      intensityUnit = 'tCO2e / tonne steel';
      formulaLines = [
        `Coal combustion = ${inputs.steelCoal} t x 2.42 = ${formatNumber(coal)} tCO2e`,
        `Limestone process CO2 = ${inputs.steelLimestone} t x 0.44 = ${formatNumber(limestone)} tCO2e`,
        `Grid electricity = ${inputs.steelElectricity} MWh x 0.716 = ${formatNumber(scope2)} tCO2e`,
      ];
    } else if (activeSector === 'cement') {
      const coal = inputs.cementCoal * factors.coalTPerTonne;
      const calcination = inputs.cementClinker * 0.52 - inputs.cementBypassDust * 0.52 * 0.2;
      scope1 = coal + calcination;
      scope2 = (inputs.cementProduction * 110 * factors.gridKgPerKwh) / 1000;
      scope3 = inputs.cementProduction * 0.08;
      intensity = inputs.cementProduction > 0 ? (scope1 + scope2 + scope3) / inputs.cementProduction : 0;
      intensityUnit = 'tCO2e / tonne cement';
      formulaLines = [
        `Kiln coal = ${inputs.cementCoal} t x 2.42 = ${formatNumber(coal)} tCO2e`,
        `Clinker calcination = (${inputs.cementClinker} t x 0.52) - CKD correction = ${formatNumber(calcination)} tCO2e`,
        `Grinding power = ${inputs.cementProduction} t x 110 kWh/t x 0.716 / 1000 = ${formatNumber(scope2)} tCO2e`,
      ];
    } else if (activeSector === 'aluminum') {
      const anode = inputs.aluminumAnode * 3.21;
      scope1 = anode;
      if (inputs.aluminumCaptivePower) {
        const captiveCoal = inputs.aluminumProduction * 7 * factors.coalTPerTonne;
        scope1 += captiveCoal;
      } else {
        scope2 = inputs.aluminumElectricity * factors.gridTPerMwh;
      }
      scope3 = inputs.aluminumProduction * 1.8;
      intensity = inputs.aluminumProduction > 0 ? (scope1 + scope2 + scope3) / inputs.aluminumProduction : 0;
      intensityUnit = 'tCO2e / tonne aluminum';
      formulaLines = [
        `Carbon anode oxidation = ${inputs.aluminumAnode} t x 3.21 = ${formatNumber(anode)} tCO2e`,
        inputs.aluminumCaptivePower
          ? `Captive coal power proxy = ${inputs.aluminumProduction} t output x 7 t coal/t x 2.42`
          : `Grid electricity = ${inputs.aluminumElectricity} MWh x 0.716 = ${formatNumber(scope2)} tCO2e`,
      ];
    } else if (activeSector === 'chemicals') {
      const gas = inputs.chemGasFlared * factors.gasTPerScm * 0.98;
      const n2o = inputs.chemN2O * 273;
      scope1 = gas + n2o;
      scope2 = inputs.chemProduction * 1.5 * factors.gridTPerMwh;
      scope3 = inputs.chemProduction * 0.35;
      intensity = inputs.chemProduction > 0 ? (scope1 + scope2 + scope3) / inputs.chemProduction : 0;
      intensityUnit = 'tCO2e / tonne chemical output';
      formulaLines = [
        `Gas flaring = ${inputs.chemGasFlared} SCM x 0.00202 x 98% = ${formatNumber(gas)} tCO2e`,
        `N2O process release = ${inputs.chemN2O} t x AR6 GWP 273 = ${formatNumber(n2o)} tCO2e`,
      ];
    } else if (activeSector === 'textiles') {
      scope3 = (inputs.textileYarnWeight / 1000) * 4.8;
      scope2 = (inputs.textileElectricity * factors.gridKgPerKwh) / 1000;
      scope1 = inputs.textileDiesel * factors.dieselTPerLitre;
      const yarnTonnes = inputs.textileYarnWeight / 1000;
      intensity = yarnTonnes > 0 ? (scope1 + scope2 + scope3) / yarnTonnes : 0;
      intensityUnit = 'tCO2e / tonne yarn';
      formulaLines = [
        `Cotton/yarn sourcing = ${inputs.textileYarnWeight} kg / 1000 x 4.8 = ${formatNumber(scope3)} tCO2e`,
        `Spinning electricity = ${inputs.textileElectricity} kWh x 0.716 / 1000 = ${formatNumber(scope2)} tCO2e`,
        `Diesel backup = ${inputs.textileDiesel} L x 0.00268 = ${formatNumber(scope1)} tCO2e`,
      ];
    } else if (activeSector === 'logistics') {
      const modeFactor = inputs.logisticsMode === 'road' ? 0.062 : inputs.logisticsMode === 'rail' ? 0.022 : 0.0085;
      const tonKm = inputs.logisticsWeight * inputs.logisticsDistance;
      scope3 = (tonKm * modeFactor) / 1000;
      intensity = tonKm > 0 ? (scope3 * 1000) / tonKm : 0;
      intensityUnit = 'kgCO2e / tonne-km';
      formulaLines = [
        `Freight work = ${inputs.logisticsWeight} t x ${inputs.logisticsDistance} km = ${formatNumber(tonKm)} tonne-km`,
        `GLEC-style freight = tonne-km x ${modeFactor} kgCO2e/tkm / 1000 = ${formatNumber(scope3)} tCO2e`,
      ];
    } else {
      const rawEnergy = inputs.serviceITEnergy * inputs.servicePUE;
      scope2 = rawEnergy * factors.gridTPerMwh;
      const commutePassengerKm = inputs.serviceEmployees * inputs.serviceCommuteDays * inputs.serviceCommuteAvgDistance;
      scope3 = (commutePassengerKm * 0.12) / 1000;
      intensity = inputs.serviceEmployees > 0 ? ((scope2 + scope3) * 1000) / inputs.serviceEmployees : 0;
      intensityUnit = 'kgCO2e / employee-year';
      formulaLines = [
        `IT energy with PUE = ${inputs.serviceITEnergy} MWh x ${inputs.servicePUE} = ${formatNumber(rawEnergy)} MWh`,
        `Grid emissions = ${formatNumber(rawEnergy)} MWh x 0.716 = ${formatNumber(scope2)} tCO2e`,
        `Commute = employees x days x km x 0.12 kg/km = ${formatNumber(scope3)} tCO2e`,
      ];
    }

    const total = scope1 + scope2 + scope3;
    return {
      scope1: Number(scope1.toFixed(2)),
      scope2: Number(scope2.toFixed(2)),
      scope3: Number(scope3.toFixed(2)),
      total: Number(total.toFixed(2)),
      intensity: Number(intensity.toFixed(3)),
      intensityUnit,
      formulaLines,
    };
  }, [activeSector, inputs]);

  const chartData = [
    { name: 'Scope 1', value: result.scope1, color: '#3F7D58' },
    { name: 'Scope 2', value: result.scope2, color: '#C88A32' },
    { name: 'Scope 3', value: result.scope3, color: '#252A27' },
  ].filter((item) => item.value > 0);

  const trajectory = [0, 1, 2, 3, 4].map((step) => ({
    label: step === 0 ? 'Base' : `Q${step}`,
    current: Number((result.total * (1 - step * 0.07)).toFixed(2)),
    target: Number((result.total * (1 - step * 0.1)).toFixed(2)),
  }));

  const readiness = Math.round((Object.values(checkedDocs).filter(Boolean).length / evidenceDocs.length) * 100);

  const downloadReport = () => {
    const activeLabel = sectorTabs.find((tab) => tab.id === activeSector)?.label ?? activeSector;
    const report = [
      'BALANCING CARBON PUBLIC CALCULATION REPORT',
      `Sector: ${activeLabel}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `Scope 1: ${result.scope1} tCO2e`,
      `Scope 2: ${result.scope2} tCO2e`,
      `Scope 3: ${result.scope3} tCO2e`,
      `Total: ${result.total} tCO2e`,
      `Intensity: ${result.intensity} ${result.intensityUnit}`,
      '',
      'Formula proof:',
      ...result.formulaLines.map((line) => `- ${line}`),
      '',
      'Evidence readiness:',
      ...evidenceDocs.map((doc) => `- ${checkedDocs[doc] ? '[ready]' : '[missing]'} ${doc}`),
      '',
      'Note: This public sandbox uses prototype factors and proxy Scope 3 multipliers. Use the secure tenant dashboard for audit-controlled ledgers.',
    ].join('\n');

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `balancing-carbon-${activeSector}-sandbox.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  const inputClass = 'mt-1.5 w-full border border-brand-border p-2.5 rounded bg-brand-offwhite text-xs font-mono text-brand-charcoal';
  const labelClass = 'block text-xs font-bold text-brand-charcoal';
  const hintClass = 'text-[10px] text-gray-400 font-mono mt-1 block';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
        <div className="lg:col-span-8 space-y-3">
          <span className="text-[10px] font-mono uppercase text-brand-forest tracking-widest font-bold bg-brand-sage/30 px-3 py-1 rounded-full">
            Multi-Sector Computational Sandbox
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-brand-charcoal tracking-tight">
            Industrial carbon calculator with live formulas
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-3xl">
            Model steel, cement, aluminum, chemicals, textiles, logistics, and service operations with live scope breakdowns, intensity metrics, evidence readiness, and downloadable calculation proof.
          </p>
        </div>
        <div className="lg:col-span-4 bg-white border border-brand-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-brand-forest" />
            <div>
              <div className="text-[10px] font-mono uppercase text-gray-400 font-bold">Public Sandbox</div>
              <div className="text-sm font-extrabold text-brand-charcoal">Prototype factors, transparent formulas</div>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
            For formal reporting, save activity records inside the tenant dashboard so factors, evidence, and updates are auditable.
          </p>
        </div>
      </div>

      <div className="bg-white border border-brand-border rounded-2xl p-3 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          {sectorTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeSector === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSector(tab.id)}
                className={`shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-mono font-bold border transition-all ${
                  active
                    ? 'bg-brand-charcoal text-white border-brand-charcoal shadow-sm'
                    : 'bg-brand-offwhite text-gray-600 border-brand-border hover:text-brand-charcoal'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-brand-border rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-brand-border/50 pb-4">
            <Calculator className="w-5 h-5 text-brand-forest" />
            <h2 className="text-sm font-mono font-extrabold uppercase tracking-wider text-brand-charcoal">Operational Inputs</h2>
          </div>

          {activeSector === 'steel' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Coal consumed" unit="metric tonnes" value={inputs.steelCoal} onChange={(value) => setNumber('steelCoal', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Scope 1 combustion, 2.42 tCO2e/t." />
              <Input label="Limestone feed" unit="metric tonnes" value={inputs.steelLimestone} onChange={(value) => setNumber('steelLimestone', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Process CO2 proxy, 44% conversion." />
              <Input label="Grid electricity" unit="MWh" value={inputs.steelElectricity} onChange={(value) => setNumber('steelElectricity', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Scope 2, 0.716 tCO2e/MWh." />
              <Input label="Steel output" unit="metric tonnes" value={inputs.steelProduction} onChange={(value) => setNumber('steelProduction', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Intensity denominator." />
            </div>
          )}

          {activeSector === 'cement' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Kiln coal" unit="metric tonnes" value={inputs.cementCoal} onChange={(value) => setNumber('cementCoal', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Scope 1 combustion." />
              <Input label="Clinker produced" unit="metric tonnes" value={inputs.cementClinker} onChange={(value) => setNumber('cementClinker', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Calcination proxy, 0.52 tCO2/t clinker." />
              <Input label="Bypass dust loss" unit="metric tonnes" value={inputs.cementBypassDust} onChange={(value) => setNumber('cementBypassDust', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Corrective CKD adjustment." />
              <Input label="Cement output" unit="metric tonnes" value={inputs.cementProduction} onChange={(value) => setNumber('cementProduction', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Grinding power estimated at 110 kWh/t." />
            </div>
          )}

          {activeSector === 'aluminum' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Carbon anode consumed" unit="metric tonnes" value={inputs.aluminumAnode} onChange={(value) => setNumber('aluminumAnode', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Anode oxidation, 3.21 tCO2e/t." />
              <Input label="Grid electricity" unit="MWh" value={inputs.aluminumElectricity} onChange={(value) => setNumber('aluminumElectricity', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Used when captive power is off." />
              <Input label="Aluminum output" unit="metric tonnes" value={inputs.aluminumProduction} onChange={(value) => setNumber('aluminumProduction', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Intensity denominator." />
              <label className="flex items-center justify-between gap-3 border border-brand-border rounded-xl p-3 bg-brand-offwhite text-xs font-bold text-brand-charcoal">
                Captive coal power
                <input
                  type="checkbox"
                  checked={inputs.aluminumCaptivePower}
                  onChange={(e) => setInputs((prev) => ({ ...prev, aluminumCaptivePower: e.target.checked }))}
                  className="w-4 h-4 accent-brand-forest"
                />
              </label>
            </div>
          )}

          {activeSector === 'chemicals' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Natural gas flared" unit="SCM" value={inputs.chemGasFlared} onChange={(value) => setNumber('chemGasFlared', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="98% combustion efficiency proxy." />
              <Input label="N2O released" unit="metric tonnes" value={inputs.chemN2O} onChange={(value) => setNumber('chemN2O', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="AR6 GWP: 273." />
              <Input label="Chemical output" unit="metric tonnes" value={inputs.chemProduction} onChange={(value) => setNumber('chemProduction', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Energy and intensity denominator." />
            </div>
          )}

          {activeSector === 'textiles' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Cotton/yarn feed" unit="kg" value={inputs.textileYarnWeight} onChange={(value) => setNumber('textileYarnWeight', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Scope 3 sourcing proxy." />
              <Input label="Spinning electricity" unit="kWh" value={inputs.textileElectricity} onChange={(value) => setNumber('textileElectricity', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Scope 2 grid draw." />
              <Input label="Diesel generator fuel" unit="litres" value={inputs.textileDiesel} onChange={(value) => setNumber('textileDiesel', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Scope 1 backup power." />
            </div>
          )}

          {activeSector === 'logistics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['road', 'rail', 'sea'] as LogisticsMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setInputs((prev) => ({ ...prev, logisticsMode: mode }))}
                    className={`rounded-xl border p-2 text-xs font-bold capitalize ${
                      inputs.logisticsMode === mode ? 'bg-brand-charcoal text-white border-brand-charcoal' : 'bg-brand-offwhite text-gray-600 border-brand-border'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Cargo weight" unit="metric tonnes" value={inputs.logisticsWeight} onChange={(value) => setNumber('logisticsWeight', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Freight mass." />
                <Input label="Travel distance" unit="km" value={inputs.logisticsDistance} onChange={(value) => setNumber('logisticsDistance', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Used for tonne-km." />
              </div>
            </div>
          )}

          {activeSector === 'services' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="IT infrastructure energy" unit="MWh" value={inputs.serviceITEnergy} onChange={(value) => setNumber('serviceITEnergy', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Server and equipment power." />
              <Input label="Power Usage Effectiveness" unit="PUE" value={inputs.servicePUE} onChange={(value) => setNumber('servicePUE', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Cooling and overhead multiplier." />
              <Input label="Employees" unit="people" value={inputs.serviceEmployees} onChange={(value) => setNumber('serviceEmployees', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Commute denominator." />
              <Input label="Commute days" unit="days/year" value={inputs.serviceCommuteDays} onChange={(value) => setNumber('serviceCommuteDays', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Annual work commute days." />
              <Input label="Average commute distance" unit="km/day" value={inputs.serviceCommuteAvgDistance} onChange={(value) => setNumber('serviceCommuteAvgDistance', value)} inputClass={inputClass} labelClass={labelClass} hintClass={hintClass} hint="Passenger-km proxy." />
            </div>
          )}

          <div className="bg-brand-sage/20 border border-brand-sage rounded-xl p-4 text-[11px] text-gray-600 leading-relaxed flex gap-2">
            <HelpCircle className="w-4 h-4 text-brand-forest shrink-0 mt-0.5" />
            <span>
              These formulas are transparent sandbox estimates. The tenant dashboard remains the source of truth for auditable activity records, factor IDs, evidence, and facility aggregation.
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-brand-charcoal text-white rounded-2xl p-5 md:p-6 shadow-lg">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-sage font-bold">Live Computational Report</span>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <Metric label="Scope 1" value={result.scope1} />
              <Metric label="Scope 2" value={result.scope2} />
              <Metric label="Scope 3" value={result.scope3} />
            </div>
            <div className="mt-5 border-t border-white/10 pt-5">
              <div className="flex justify-between items-end gap-4">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Total Inventory</span>
                  <div className="text-3xl font-black font-mono text-brand-sage">{formatNumber(result.total)} tCO2e</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Intensity</span>
                  <div className="text-xl font-black font-mono">{result.intensity}</div>
                  <div className="text-[10px] text-gray-400">{result.intensityUnit}</div>
                </div>
              </div>
            </div>
            <button
              onClick={downloadReport}
              className="mt-5 w-full bg-white text-brand-charcoal hover:bg-brand-sage rounded-xl py-3 text-xs font-mono font-bold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {downloaded ? 'Download Again' : 'Download Calculation Proof'}
            </button>
          </div>

          <div className="bg-white border border-brand-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-brand-charcoal mb-4">Formula Proof</h3>
            <div className="space-y-2 font-mono text-[11px] text-gray-600">
              {result.formulaLines.map((line) => (
                <div key={line} className="bg-brand-offwhite border border-brand-border/60 rounded-lg p-2.5">{line}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-brand-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-brand-charcoal">Scope Allocation</h3>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} innerRadius={62} outerRadius={88} paddingAngle={4} dataKey="value">
                  {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value) => [`${value} tCO2e`, 'Emissions']} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-brand-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-brand-charcoal">12-Month Reduction Trajectory</h3>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trajectory} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E8E4" />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="current" name="Current pathway" fill="#252A27" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Target pathway" fill="#3F7D58" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-brand-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-brand-border/60 pb-4">
            <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-brand-charcoal">Audit Evidence Checklist</h3>
            <span className="text-xs font-mono font-bold bg-brand-sage text-brand-forest px-2 py-1 rounded">Readiness {readiness}%</span>
          </div>
          <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1">
            {evidenceDocs.map((doc) => {
              const checked = Boolean(checkedDocs[doc]);
              return (
                <button
                  key={doc}
                  onClick={() => setCheckedDocs((prev) => ({ ...prev, [doc]: !checked }))}
                  className={`w-full flex items-center justify-between gap-3 text-left p-3 rounded-xl border text-xs transition-all ${
                    checked ? 'bg-brand-sage/25 border-brand-forest/40 text-brand-charcoal' : 'bg-white border-brand-border text-gray-600 hover:bg-brand-offwhite'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-brand-forest border-brand-forest text-white' : 'border-brand-border'}`}>
                      {checked && <Check className="w-3 h-3" />}
                    </span>
                    <span className="truncate">{doc}</span>
                  </span>
                  <span className={`text-[9px] font-mono uppercase font-bold shrink-0 ${checked ? 'text-brand-forest' : 'text-gray-400'}`}>
                    {checked ? 'Ready' : 'Missing'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-brand-sage/20 border border-brand-sage rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-brand-forest">{ctaTitle}</h3>
          <p className="text-xs text-gray-600 leading-relaxed mt-3">
            {ctaDescription}
          </p>
          <button
            onClick={onRegister}
            className="mt-5 bg-brand-forest hover:bg-brand-green-sec text-white px-5 py-3 rounded-xl text-xs font-mono font-bold flex items-center gap-2"
          >
            {ctaButtonLabel} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  unit,
  value,
  onChange,
  inputClass,
  labelClass,
  hintClass,
  hint,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (value: string) => void;
  inputClass: string;
  labelClass: string;
  hintClass: string;
  hint: string;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <div className="flex">
        <input type="number" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} rounded-r-none`} />
        <span className="mt-1.5 bg-brand-sage text-brand-forest border-y border-r border-brand-border px-3 rounded-r font-mono font-semibold flex items-center justify-center min-w-20 text-[10px]">
          {unit}
        </span>
      </div>
      <span className={hintClass}>{hint}</span>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/8 border border-white/10 rounded-xl p-3">
      <span className="text-[9px] text-gray-400 uppercase font-mono">{label}</span>
      <div className="font-mono font-black text-brand-sage">{formatNumber(value)}</div>
      <span className="text-[9px] text-gray-500">tCO2e</span>
    </div>
  );
}
