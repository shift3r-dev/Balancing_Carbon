import React, { useState } from 'react';
import { 
  Plus, Upload, FileSpreadsheet, Eye, HelpCircle, Calendar, 
  Tag, Info, Filter, ArrowUpRight, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { EnergyRecord, Facility } from '../types.ts';

interface EnergyProps {
  records: EnergyRecord[];
  facilities: Facility[];
  onAddRecord: (record: any) => void;
}

export default function EnergyTracking({ records, facilities, onAddRecord }: EnergyProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form states
  const [facilityId, setFacilityId] = useState(facilities[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [energyType, setEnergyType] = useState<'Grid Electricity' | 'Renewable Electricity' | 'Diesel' | 'Petrol' | 'LPG' | 'Natural Gas' | 'Furnace Oil' | 'Biomass'>('Grid Electricity');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kWh');
  const [sourceDocument, setSourceDocument] = useState('');
  const [notes, setNotes] = useState('');

  // Filtering states
  const [filterFacility, setFilterFacility] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Preview emissions states
  const [previewEmissions, setPreviewEmissions] = useState<number | null>(null);
  const [previewFactor, setPreviewFactor] = useState<number | null>(null);

  // Trigger preview on quantity/type edit
  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    const qty = parseFloat(val);
    if (!isNaN(qty)) {
      // Get mock factor to show user in real-time
      const factors: Record<string, { f: number, u: string }> = {
        'Grid Electricity': { f: 0.82, u: 'kgCO2e/kWh' },
        'Renewable Electricity': { f: 0.0, u: 'kgCO2e/kWh' },
        'Diesel': { f: 2.68, u: 'kgCO2e/Litre' },
        'Petrol': { f: 2.31, u: 'kgCO2e/Litre' },
        'LPG': { f: 2.98, u: 'kgCO2e/kg' },
        'Natural Gas': { f: 2.02, u: 'kgCO2e/m3' },
        'Furnace Oil': { f: 3.15, u: 'kgCO2e/Litre' },
        'Biomass': { f: 0.05, u: 'kgCO2e/kg' }
      };
      const factorObj = factors[energyType];
      if (factorObj) {
        const calculated = (qty * factorObj.f) / 1000;
        setPreviewEmissions(parseFloat(calculated.toFixed(4)));
        setPreviewFactor(factorObj.f);
      }
    } else {
      setPreviewEmissions(null);
      setPreviewFactor(null);
    }
  };

  const handleTypeChange = (type: any) => {
    setEnergyType(type);
    
    // Auto align default unit
    const units: Record<string, string> = {
      'Grid Electricity': 'kWh',
      'Renewable Electricity': 'kWh',
      'Diesel': 'Litres',
      'Petrol': 'Litres',
      'LPG': 'kg',
      'Natural Gas': 'm3',
      'Furnace Oil': 'Litres',
      'Biomass': 'kg'
    };
    setUnit(units[type] || 'kWh');

    // Recalculate preview if quantity exists
    const qty = parseFloat(quantity);
    if (!isNaN(qty)) {
      const factors: Record<string, { f: number, u: string }> = {
        'Grid Electricity': { f: 0.82, u: 'kgCO2e/kWh' },
        'Renewable Electricity': { f: 0.0, u: 'kgCO2e/kWh' },
        'Diesel': { f: 2.68, u: 'kgCO2e/Litre' },
        'Petrol': { f: 2.31, u: 'kgCO2e/Litre' },
        'LPG': { f: 2.98, u: 'kgCO2e/kg' },
        'Natural Gas': { f: 2.02, u: 'kgCO2e/m3' },
        'Furnace Oil': { f: 3.15, u: 'kgCO2e/Litre' },
        'Biomass': { f: 0.05, u: 'kgCO2e/kg' }
      };
      const factorObj = factors[type];
      if (factorObj) {
        const calculated = (qty * factorObj.f) / 1000;
        setPreviewEmissions(parseFloat(calculated.toFixed(4)));
        setPreviewFactor(factorObj.f);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId || !quantity) {
      alert('Please enter required details.');
      return;
    }

    onAddRecord({
      facilityId,
      date,
      energyType,
      quantity: parseFloat(quantity),
      unit,
      sourceDocument: sourceDocument || 'Manual Entry',
      notes
    });

    // Reset
    setQuantity('');
    setNotes('');
    setSourceDocument('');
    setPreviewEmissions(null);
    setShowAddForm(false);
  };

  // Filter records
  const filteredRecords = records.filter(r => {
    const matchFac = filterFacility === 'all' || r.facilityId === filterFacility;
    const matchType = filterType === 'all' || r.energyType === filterType;
    return matchFac && matchType;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-brand-border">
        <div>
          <h1 className="text-xl font-extrabold text-brand-charcoal">Energy & Fuel Tracking</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Log raw facility activity data, upload invoices, and trigger auditable Scope 1 & 2 carbon calculations.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-brand-forest hover:bg-brand-green-sec text-white px-4 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {showAddForm ? 'Close Entry Form' : 'Log New Energy Record'}
          </button>
        </div>
      </div>

      {/* Grid: Entry & Bulk Upload */}
      {showAddForm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          {/* Manual Entry Form */}
          <div className="bg-white border border-brand-border rounded-xl p-5 lg:col-span-2 space-y-4">
            <h3 className="font-bold text-sm font-mono uppercase tracking-wider text-brand-charcoal flex items-center gap-1">
              <Calendar className="w-4 h-4 text-brand-forest" /> Manual Energy Activity Logging
            </h3>

            <form onSubmit={handleSubmit} className="text-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Target Manufacturing Facility *</label>
                  <select
                    value={facilityId}
                    onChange={(e) => setFacilityId(e.target.value)}
                    className="w-full border border-brand-border p-2.5 rounded bg-white text-xs"
                    required
                  >
                    <option value="">Select Facility</option>
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Log Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite font-mono"
                  />
                </div>
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Energy / Fuel Stream *</label>
                  <select
                    value={energyType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full border border-brand-border p-2.5 rounded bg-white text-xs font-mono"
                    required
                  >
                    <option value="Grid Electricity">Grid Electricity</option>
                    <option value="Renewable Electricity">Renewable Electricity (Solar)</option>
                    <option value="Diesel">Diesel (Fuel)</option>
                    <option value="Petrol">Petrol (Fuel)</option>
                    <option value="LPG">LPG (Liquefied Petroleum Gas)</option>
                    <option value="Natural Gas">Natural Gas</option>
                    <option value="Furnace Oil">Furnace Oil</option>
                    <option value="Biomass">Biomass</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Activity Quantity *</label>
                  <div className="flex">
                    <input
                      type="number"
                      required
                      placeholder="e.g. 24000"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      className="w-full border border-brand-border p-2.5 rounded-l text-xs bg-brand-offwhite font-mono"
                    />
                    <span className="bg-brand-sage text-brand-forest border-y border-r border-brand-border px-3 rounded-r font-mono font-semibold flex items-center justify-center min-w-16">
                      {unit}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Source Invoice File (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. IOCL_Invoice_778.pdf"
                    value={sourceDocument}
                    onChange={(e) => setSourceDocument(e.target.value)}
                    className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite"
                  />
                </div>
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Internal Description Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Tank refilled for Line-B generator"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite"
                  />
                </div>
              </div>

              {/* Emissions real-time calculator card */}
              {previewEmissions !== null && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-center justify-between text-xs font-mono text-brand-forest">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-brand-green-sec block">Deterministic Emission Preview</span>
                    <p className="mt-1">
                      {quantity} {unit} × {previewFactor} kgCO2e/{unit === 'Litres' ? 'L' : unit} = <strong>{previewEmissions} tCO₂e</strong>
                    </p>
                  </div>
                  <div className="text-right text-brand-charcoal">
                    <span className="text-[10px] text-gray-400 block">Scope Classification</span>
                    <span className="font-bold">
                      {energyType.includes('Electricity') ? 'Scope 2 (Indirect)' : 'Scope 1 (Direct)'}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-forest hover:bg-brand-green-sec text-white rounded text-xs font-bold transition-all cursor-pointer"
                >
                  Apply & Commit Calculation
                </button>
              </div>
            </form>
          </div>

          {/* Bulk Ingestion and drag-and-drop placeholder */}
          <div className="bg-white border border-brand-border rounded-xl p-5 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm font-mono uppercase tracking-wider text-brand-charcoal flex items-center gap-1">
                <Upload className="w-4 h-4 text-brand-forest" /> Bulk Utility Ingestion
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Skip manual entries! Drag electricity invoices, smart meter XMLs, or IOCL fuel slips here to let our AI scan and index consumption.
              </p>
            </div>

            <div className="border border-dashed border-brand-border/80 bg-brand-offwhite rounded-lg p-6 text-center hover:bg-brand-sage/15 transition-all cursor-pointer">
              <Upload className="w-8 h-8 text-brand-forest mx-auto mb-3 opacity-60" />
              <span className="text-xs font-bold block text-brand-charcoal">Drag Invoices Here</span>
              <span className="text-[10px] text-gray-400 block mt-1 font-mono">Supports PDF, PNG, XML, CSV</span>
            </div>

            <button
              onClick={() => alert('CSV template downloading... Please configure your facility IDs in rows.')}
              className="w-full text-xs font-mono font-bold bg-white text-brand-charcoal hover:bg-gray-50 border border-brand-border p-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-brand-forest" /> Download CSV Template
            </button>
          </div>

        </div>
      )}

      {/* Energy Records Ledger */}
      <div className="bg-white border border-brand-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 border-b border-brand-border/40 pb-4">
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-brand-charcoal flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-brand-forest" /> Activity Ledger ({filteredRecords.length} entries)
          </h2>
          
          <div className="flex flex-wrap gap-2 text-xs">
            {/* Facility Filter */}
            <div>
              <select
                value={filterFacility}
                onChange={(e) => setFilterFacility(e.target.value)}
                className="border border-brand-border p-2 rounded bg-brand-offwhite text-xs font-mono"
              >
                <option value="all">All Facilities</option>
                {facilities.map(f => (
                  <option key={f.id} value={f.id}>{f.name.replace(' Manufacturing Plant', '').replace(' Component Facility', '')}</option>
                ))}
              </select>
            </div>
            
            {/* Energy Type Filter */}
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-brand-border p-2 rounded bg-brand-offwhite text-xs font-mono"
              >
                <option value="all">All Streams</option>
                <option value="Grid Electricity">Grid Electricity</option>
                <option value="Renewable Electricity">Renewable Electricity</option>
                <option value="Diesel">Diesel</option>
                <option value="Petrol">Petrol</option>
                <option value="LPG">LPG</option>
                <option value="Natural Gas">Natural Gas</option>
                <option value="Furnace Oil">Furnace Oil</option>
                <option value="Biomass">Biomass</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-500">
            <thead className="text-[10px] text-gray-400 uppercase font-mono tracking-wider bg-brand-offwhite border-b border-brand-border">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Facility</th>
                <th className="p-3">Energy Stream</th>
                <th className="p-3 text-right">Quantity logged</th>
                <th className="p-3 text-right">Scope Footprint</th>
                <th className="p-3">Evidence Source</th>
                <th className="p-3">Calculated Factor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40">
              {filteredRecords.map((r) => {
                const facilityName = facilities.find(f => f.id === r.facilityId)?.name || 'Unknown';
                const isRenew = r.energyType === 'Renewable Electricity';
                return (
                  <tr key={r.id} className="hover:bg-brand-sage/5 transition-colors">
                    <td className="p-3 font-mono text-brand-charcoal whitespace-nowrap">{r.date}</td>
                    <td className="p-3 font-medium text-brand-charcoal whitespace-nowrap">{facilityName.replace(' Manufacturing Plant', '').replace(' Component Facility', '')}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        isRenew ? 'bg-emerald-100 text-brand-forest' :
                        r.energyType.includes('Electricity') ? 'bg-amber-100 text-brand-amber' : 'bg-gray-100 text-brand-charcoal'
                      }`}>
                        {r.energyType}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-brand-charcoal whitespace-nowrap">
                      {r.quantity.toLocaleString()} {r.unit}
                    </td>
                    <td className="p-3 text-right font-mono font-bold whitespace-nowrap text-brand-charcoal">
                      {isRenew ? '0.00 t' : `${r.emissions.toFixed(3)} tCO₂e`}
                    </td>
                    <td className="p-3 text-gray-400 font-mono italic whitespace-nowrap truncate max-w-44" title={r.sourceDocument}>
                      {r.sourceDocument}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-[10px] font-mono text-gray-400">
                        {r.auditTrail.emissionFactor} {r.auditTrail.factorUnit}
                        <span className="block text-[8px] text-gray-300 italic truncate max-w-44" title={r.auditTrail.factorSource}>
                          Source: {r.auditTrail.factorSource}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-12 font-mono">
                    No matching activity logs registered in this multi-tenant tenant context.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
