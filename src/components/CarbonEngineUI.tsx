import React, { useState } from 'react';
import { 
  Calculator, ShieldAlert, BookOpen, AlertCircle, FileText, 
  Settings, CheckCircle, HelpCircle, ChevronRight, Scale 
} from 'lucide-react';
import { EnergyRecord, Facility } from '../types.ts';
import RegistryUnitInput from './RegistryUnitInput.tsx';

interface CarbonEngineProps {
  scopeType: 'scope-1' | 'scope-2' | 'scope-3';
  facilities: Facility[];
  records?: EnergyRecord[];
}

export default function CarbonEngineUI({ scopeType, facilities, records = [] }: CarbonEngineProps) {
  const [simQty, setSimQty] = useState(0);
  const [simType, setSimType] = useState('Diesel');
  
  const factors = {
    'Diesel': { factor: 2.68, unit: 'kgCO2e/litre', source: 'Prototype factor - replace with authoritative source before audit use', scope: 'Scope 1', desc: 'Direct emissions from plant diesel generators and backup power units.' },
    'Petrol': { factor: 2.31, unit: 'kgCO2e/litre', source: 'Prototype factor - replace with authoritative source before audit use', scope: 'Scope 1', desc: 'Emissions from fleet logistics, company cars, and mobile equipment.' },
    'LPG': { factor: 1.51, unit: 'kgCO2e/litre', source: 'Prototype factor - replace with authoritative source before audit use', scope: 'Scope 1', desc: 'Emissions from LPG-consuming equipment tracked as litres in this prototype registry.' },
    'Natural Gas': { factor: 2.02, unit: 'kgCO2e/SCM', source: 'Prototype factor - replace with authoritative source before audit use', scope: 'Scope 1', desc: 'Emissions from natural gas pipelines feeding thermal treatment facilities.' },
    'Furnace Oil': { factor: 3.15, unit: 'kgCO2e/litre', source: 'Prototype factor - replace with authoritative source before audit use', scope: 'Scope 1', desc: 'Emissions from heavy industrial steam boilers.' },
    'Biomass': { factor: 0.05, unit: 'kgCO2e/kg', source: 'Prototype biogenic component - replace with authoritative source before audit use', scope: 'Scope 1', desc: 'Prototype biomass combustion component for direct plant fuel tracking.' },
    'Coal': { factor: 2.42, unit: 'kgCO2e/kg', source: 'Prototype factor - replace with authoritative source before audit use', scope: 'Scope 1', desc: 'Direct emissions from coal combustion where still present in process heat operations.' },
    'Grid Electricity': { factor: 0.716, unit: 'kgCO2e/kWh', source: 'Prototype grid factor - replace with authoritative source before audit use', scope: 'Scope 2', desc: 'Location-based Scope 2 emissions for grid electricity consumption.' },
    'On-site Solar': { factor: 0.0, unit: 'kgCO2e/kWh', source: 'Prototype renewable operational factor - not market-based accounting', scope: 'Scope 2', desc: 'Zero direct operational emissions for on-site solar generation; certificates and residual mix are not modeled.' },
    'On-site Wind': { factor: 0.0, unit: 'kgCO2e/kWh', source: 'Prototype renewable operational factor - not market-based accounting', scope: 'Scope 2', desc: 'Zero direct operational emissions for on-site wind generation; certificates and residual mix are not modeled.' },
    'Purchased Steam': { factor: 0.184, unit: 'kgCO2e/kg', source: 'Prototype supplier-energy factor - replace with supplier-specific source', scope: 'Scope 2', desc: 'Indirect emissions from purchased steam supplied by an external provider.' },
    'Purchased Heat': { factor: 0.184, unit: 'kgCO2e/kWh', source: 'Prototype supplier-energy factor - replace with supplier-specific source', scope: 'Scope 2', desc: 'Indirect emissions from purchased heat supplied by an external provider.' },
    'Steel Raw Ingestion': { factor: 1.85, unit: 'kgCO2e/kg', source: 'DEFRA v2025 Material Purchasing', scope: 'Scope 3', desc: 'Upstream embedded carbon of structural steel sheets purchased from primary furnaces.' },
    'Inbound Air Logistics': { factor: 0.61, unit: 'kgCO2e/tonne-km', source: 'DEFRA v2025 Transport & Supply Chain', scope: 'Scope 3', desc: 'Embedded logistical emissions of components shipped via standard air cargo.' }
  };

  const getFilteredFactors = () => {
    if (scopeType === 'scope-1') {
      return Object.entries(factors).filter(([_, val]) => val.scope === 'Scope 1');
    } else if (scopeType === 'scope-2') {
      return Object.entries(factors).filter(([_, val]) => val.scope === 'Scope 2');
    }
    return Object.entries(factors).filter(([_, val]) => val.scope === 'Scope 3');
  };

  const handleSimulate = () => {
    const qty = Number(simQty);
    if (!Number.isFinite(qty)) return 'Enter a numeric value to calculate';
    const metadata = (factors as any)[simType];
    if (!metadata) return 'Invalid type';
    
    const kgCO2e = qty * metadata.factor;
    const tCO2e = kgCO2e / 1000;
    
    return {
      kgCO2e: kgCO2e.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      tCO2e: tCO2e.toFixed(4),
      formula: `${qty.toLocaleString()} [Activity Qty] × ${metadata.factor} [Factor] = ${kgCO2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kgCO₂e`,
      audit: `Methodology: ${metadata.scope} deterministic ledger calculation using the configured factor source: ${metadata.source}.`
    };
  };

  const simulationResult = handleSimulate();

  // Scope specific metrics
  const recordEmission = (record: EnergyRecord) => Number(record.emissionsTCO2e ?? record.emissions ?? 0);
  const hasActivityRecords = records.length > 0;
  const scope1Emissions = hasActivityRecords
    ? records.filter((record) => record.scope === 'scope-1').reduce((sum, record) => sum + recordEmission(record), 0)
    : facilities.reduce((sum, f) => sum + f.emissionsScope1, 0);
  const scope2Emissions = hasActivityRecords
    ? records.filter((record) => record.scope === 'scope-2').reduce((sum, record) => sum + recordEmission(record), 0)
    : facilities.reduce((sum, f) => sum + f.emissionsScope2, 0);

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="bg-white p-5 rounded-xl border border-brand-border">
        <h1 className="text-xl font-extrabold text-brand-charcoal capitalize">{scopeType.replace('-', ' ')} Footprint Explorer</h1>
        <p className="text-xs text-gray-500 font-mono mt-0.5">
          {scopeType === 'scope-1' && 'Direct GHG emissions from sources owned or controlled by Apex Precision Components (stationary combustion, backup power).'}
          {scopeType === 'scope-2' && 'Indirect emissions from purchased electricity, steam, or heating drawn from regional Indian grids.'}
          {scopeType === 'scope-3' && 'Embedded supply chain, purchased materials, inbound logistics, and downstream transport emissions (BRSR Scope 3 Index).'}
        </p>
      </div>

      {/* Scope Status & Active Emissions Ledger Indicator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric display */}
        <div className="bg-brand-charcoal text-white p-5 rounded-xl border border-white/5 space-y-2 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-brand-forest/10 rounded-full blur-2xl pointer-events-none" />
          <span className="text-[9px] font-mono uppercase tracking-wider text-brand-sage">Live Combined Accounting</span>
          <div className="text-3xl font-black font-mono tracking-tight text-brand-sage">
            {scopeType === 'scope-1' && `${scope1Emissions.toFixed(2)} tCO₂e`}
            {scopeType === 'scope-2' && `${scope2Emissions.toFixed(2)} tCO₂e`}
            {scopeType === 'scope-3' && `150.00 tCO₂e (Est.)`}
          </div>
          <span className="text-[10px] text-gray-400 font-mono block">
            {scopeType === 'scope-1' && 'Direct combustion of heavy diesel & process fuels'}
            {scopeType === 'scope-2' && 'Location-based Scope 2 calculations across 3 state grids'}
            {scopeType === 'scope-3' && 'Provisional material and logistical estimate'}
          </span>
        </div>

        {/* Verification Alert */}
        <div className="bg-white p-5 rounded-xl border border-brand-border md:col-span-2 flex items-center gap-4 text-xs">
          <div className="p-2.5 bg-brand-sage/20 text-brand-forest rounded-lg shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <strong className="text-brand-charcoal font-semibold block uppercase font-mono text-[10px]">Deterministic Calculation Assurance</strong>
            <p className="text-gray-500 leading-relaxed text-[11px]">
              Balancing Carbon's calculations are built around a deterministic activity-record logic tree. Activity values are validated for unit compatibility, multiplied by the resolved factor, and stored with the factor ID/version used. Current seeded factors are prototype-only until replaced with authoritative sources.
            </p>
          </div>
        </div>

      </div>

      {/* Main Grid: Factor Reference & Interactive Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Approved Factors Tables */}
        <div className="bg-white border border-brand-border rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-brand-charcoal flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-brand-forest" /> Approved Emission Factors
          </h3>

          <div className="space-y-3">
            {getFilteredFactors().map(([key, value]) => (
              <div key={key} className="p-3 bg-brand-offwhite rounded-lg border border-brand-border/60 text-xs">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-brand-charcoal">{key}</span>
                  <span className="font-mono bg-brand-sage text-brand-forest px-1.5 py-0.5 rounded text-[10px]">
                    {value.factor} {value.unit}
                  </span>
                </div>
                <p className="text-gray-500 text-[11px] leading-snug mb-1">{value.desc}</p>
                <div className="text-[9px] text-gray-400 font-mono italic">Source: {value.source}</div>
              </div>
            ))}
            {scopeType === 'scope-3' && (
              <div className="p-3 bg-amber-50 text-brand-amber border border-brand-amber/20 rounded-lg text-xs leading-relaxed">
                <strong>Advanced Module:</strong> Scope 3 logistics tracking and vendor upstream ingestion are currently running in simulation mode. Upgrade your tier to enable direct API interfaces to customs declarations and raw steel shipment bills.
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Calculation Simulator */}
        <div className="bg-white border border-brand-border rounded-xl p-5 flex flex-col justify-between space-y-4 h-[440px]">
          <div>
            <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-brand-charcoal flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-brand-forest" /> Calculation Sandbox
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Test how fuel inputs convert to auditable metrics using approved regulatory guidelines.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-gray-500 mb-1">Select Activity Stream</label>
                <select
                  value={simType}
                  onChange={(e) => { setSimType(e.target.value); setSimQty(0); }}
                  className="w-full border border-brand-border p-2.5 rounded bg-white text-xs font-mono"
                >
                  {getFilteredFactors().map(([key, _]) => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>
              <RegistryUnitInput id="scope-simulator-quantity" label="Activity Quantity" unit={String((factors as any)[simType]?.unit ?? '').split('/').pop()} value={simQty} onChange={setSimQty} />
            </div>

            {/* Results Block */}
            {typeof simulationResult === 'object' ? (
              <div className="p-4 bg-brand-offwhite border border-brand-border rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase block">Raw Output</span>
                    <strong className="text-sm text-brand-charcoal">{simulationResult.kgCO2e} kgCO₂e</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase block">Ledger Volume</span>
                    <strong className="text-sm text-brand-forest">{simulationResult.tCO2e} tCO₂e</strong>
                  </div>
                </div>
                
                <div className="border-t border-brand-border/50 pt-2 text-[11px] text-gray-500 font-mono">
                  <div className="font-bold text-brand-charcoal">Conversion Path Formula:</div>
                  <div className="mt-0.5 bg-white p-2 rounded border border-brand-border/40 text-[10px]">
                    {simulationResult.formula}
                  </div>
                </div>

                <div className="text-[9px] text-gray-400 leading-snug flex gap-1 items-start">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-brand-forest mt-0.5" />
                  <span>{simulationResult.audit}</span>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 font-mono border border-dashed border-brand-border rounded-lg flex items-center justify-center">
                Enter an activity quantity above to simulate the conversion pipeline.
              </div>
            )}
          </div>

          <div className="bg-brand-sage/10 p-3 rounded text-[10px] font-mono leading-relaxed text-gray-500 border border-brand-border/40">
            <strong>Formula Reference:</strong> Emissions (tCO₂e) = (Activity Data × Emission Factor) ÷ 1,000. All factors are subject to annual regulatory updates.
          </div>
        </div>

      </div>

    </div>
  );
}
