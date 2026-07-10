import React, { useState } from 'react';
import { Plus, Upload, FileSpreadsheet, Calendar, Filter, Trash2, Factory, Pencil } from 'lucide-react';
import { EnergyRecord, Facility, ProductionRecord } from '../types.ts';

interface EnergyProps {
  records: EnergyRecord[];
  productionRecords?: ProductionRecord[];
  facilities: Facility[];
  onAddRecord: (record: any) => void;
  onUpdateRecord?: (id: string, record: any) => void;
  onAddProduction?: (record: any) => void;
  onDeleteRecord?: (id: string) => void;
}

const SOURCE_OPTIONS = [
  { sourceType: 'Grid Electricity', activityType: 'electricity', unit: 'kWh', scope: 'scope-2', factor: 0.716, factorUnit: 'kgCO2e/kWh' },
  { sourceType: 'On-site Solar', activityType: 'renewable-electricity', unit: 'kWh', scope: 'scope-2', factor: 0, factorUnit: 'kgCO2e/kWh' },
  { sourceType: 'On-site Wind', activityType: 'renewable-electricity', unit: 'kWh', scope: 'scope-2', factor: 0, factorUnit: 'kgCO2e/kWh' },
  { sourceType: 'Diesel', activityType: 'fuel', unit: 'litre', scope: 'scope-1', factor: 2.68, factorUnit: 'kgCO2e/litre' },
  { sourceType: 'Petrol', activityType: 'fuel', unit: 'litre', scope: 'scope-1', factor: 2.31, factorUnit: 'kgCO2e/litre' },
  { sourceType: 'LPG', activityType: 'fuel', unit: 'litre', scope: 'scope-1', factor: 1.51, factorUnit: 'kgCO2e/litre' },
  { sourceType: 'Natural Gas', activityType: 'fuel', unit: 'SCM', scope: 'scope-1', factor: 2.02, factorUnit: 'kgCO2e/SCM' },
  { sourceType: 'Furnace Oil', activityType: 'fuel', unit: 'litre', scope: 'scope-1', factor: 3.15, factorUnit: 'kgCO2e/litre' },
  { sourceType: 'Biomass', activityType: 'fuel', unit: 'kg', scope: 'scope-1', factor: 0.05, factorUnit: 'kgCO2e/kg' },
  { sourceType: 'Coal', activityType: 'fuel', unit: 'kg', scope: 'scope-1', factor: 2.42, factorUnit: 'kgCO2e/kg' },
  { sourceType: 'Purchased Steam', activityType: 'steam', unit: 'kg', scope: 'scope-2', factor: 0.184, factorUnit: 'kgCO2e/kg' },
  { sourceType: 'Purchased Heat', activityType: 'heat', unit: 'kWh', scope: 'scope-2', factor: 0.184, factorUnit: 'kgCO2e/kWh' },
] as const;

export default function EnergyTracking({
  records,
  productionRecords = [],
  facilities,
  onAddRecord,
  onUpdateRecord,
  onAddProduction,
  onDeleteRecord,
}: EnergyProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [facilityId, setFacilityId] = useState(facilities[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportingPeriod, setReportingPeriod] = useState('FY 2025-26');
  const [activityType, setActivityType] = useState('electricity');
  const [sourceType, setSourceType] = useState('Grid Electricity');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kWh');
  const [sourceDocument, setSourceDocument] = useState('');
  const [notes, setNotes] = useState('');
  const [productionFacilityId, setProductionFacilityId] = useState(facilities[0]?.id || '');
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [productionReportingPeriod, setProductionReportingPeriod] = useState('FY 2025-26');
  const [productionQuantity, setProductionQuantity] = useState('');
  const [productionUnit, setProductionUnit] = useState('tonnes');
  const [productionSourceDocument, setProductionSourceDocument] = useState('');
  const [productionNotes, setProductionNotes] = useState('');
  const [filterFacility, setFilterFacility] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterScope, setFilterScope] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const selectedSource = SOURCE_OPTIONS.find((option) => option.sourceType === sourceType) ?? SOURCE_OPTIONS[0];
  const parsedQuantity = Number(quantity);
  const previewEmissions = Number.isFinite(parsedQuantity) && parsedQuantity >= 0
    ? (parsedQuantity * selectedSource.factor) / 1000
    : null;

  const handleSourceChange = (nextSourceType: string) => {
    const next = SOURCE_OPTIONS.find((option) => option.sourceType === nextSourceType) ?? SOURCE_OPTIONS[0];
    setSourceType(next.sourceType);
    setActivityType(next.activityType);
    setUnit(next.unit);
  };

  const resetActivityForm = () => {
    setQuantity('');
    setNotes('');
    setSourceDocument('');
    setEditingRecordId(null);
    setShowAddForm(false);
  };

  const handleEditRecord = (record: EnergyRecord) => {
    const recordSource = record.sourceType || record.energyType;
    const matched = SOURCE_OPTIONS.find((option) => option.sourceType === recordSource) ?? SOURCE_OPTIONS[0];
    setEditingRecordId(record.id);
    setFacilityId(record.facilityId);
    setDate(record.date);
    setReportingPeriod(record.reportingPeriod);
    setSourceType(matched.sourceType);
    setActivityType(matched.activityType);
    setUnit(matched.unit);
    setQuantity(String(record.quantity ?? ''));
    setSourceDocument(record.sourceDocument ?? '');
    setNotes(record.notes ?? '');
    setShowAddForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId || !sourceType || !quantity) {
      alert('Please enter required activity details.');
      return;
    }

    const payload = {
      facilityId,
      date,
      reportingPeriod,
      activityType,
      sourceType,
      energyType: sourceType,
      quantity: Number(quantity),
      unit,
      sourceDocument: sourceDocument || 'Manual Entry',
      notes,
    };

    if (editingRecordId && onUpdateRecord) {
      onUpdateRecord(editingRecordId, payload);
    } else {
      onAddRecord(payload);
    }

    resetActivityForm();
  };

  const handleProductionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddProduction || !productionFacilityId || !productionQuantity || !productionUnit) {
      alert('Please enter required production output details.');
      return;
    }

    onAddProduction({
      facilityId: productionFacilityId,
      date: productionDate,
      reportingPeriod: productionReportingPeriod,
      quantity: Number(productionQuantity),
      unit: productionUnit,
      sourceDocument: productionSourceDocument || 'Manual Production Entry',
      notes: productionNotes,
    });

    setProductionQuantity('');
    setProductionSourceDocument('');
    setProductionNotes('');
  };

  const filteredRecords = records.filter((record) => {
    const recordSource = record.sourceType || record.energyType;
    const matchFac = filterFacility === 'all' || record.facilityId === filterFacility;
    const matchType = filterType === 'all' || recordSource === filterType;
    const matchScope = filterScope === 'all' || record.scope === filterScope;
    const matchPeriod = !filterPeriod || record.reportingPeriod.toLowerCase().includes(filterPeriod.toLowerCase());
    const matchDateFrom = !filterDateFrom || record.date >= filterDateFrom;
    const matchDateTo = !filterDateTo || record.date <= filterDateTo;
    return matchFac && matchType && matchScope && matchPeriod && matchDateFrom && matchDateTo;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-brand-border">
        <div>
          <h1 className="text-xl font-extrabold text-brand-charcoal">Energy & Fuel Activity Ledger</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Store each electricity, renewable, and fuel source as an individual auditable activity record.
          </p>
        </div>
        <button
          onClick={() => {
            if (showAddForm) {
              resetActivityForm();
            } else {
              setShowAddForm(true);
            }
          }}
          className="bg-brand-forest hover:bg-brand-green-sec text-white px-4 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> {showAddForm ? 'Close Entry Form' : 'Log Activity Record'}
        </button>
      </div>

      {showAddForm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          <div className="bg-white border border-brand-border rounded-xl p-5 lg:col-span-2 space-y-4">
            <h3 className="font-bold text-sm font-mono uppercase tracking-wider text-brand-charcoal flex items-center gap-1">
              <Calendar className="w-4 h-4 text-brand-forest" /> {editingRecordId ? 'Edit Activity Record' : 'Manual Activity Logging'}
            </h3>

            <form onSubmit={handleSubmit} className="text-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Target Facility *</label>
                  <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className="w-full border border-brand-border p-2.5 rounded bg-white text-xs" required>
                    <option value="">Select Facility</option>
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.id}>{facility.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Log Date *</label>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite font-mono" />
                </div>
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Reporting Period *</label>
                  <input type="text" required value={reportingPeriod} onChange={(e) => setReportingPeriod(e.target.value)} className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Activity Category *</label>
                  <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="w-full border border-brand-border p-2.5 rounded bg-white text-xs font-mono" required>
                    <option value="electricity">Electricity</option>
                    <option value="renewable-electricity">Renewable Electricity</option>
                    <option value="fuel">Fuel</option>
                    <option value="steam">Steam</option>
                    <option value="heat">Purchased Heat</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Source Type *</label>
                  <select value={sourceType} onChange={(e) => handleSourceChange(e.target.value)} className="w-full border border-brand-border p-2.5 rounded bg-white text-xs font-mono" required>
                    {SOURCE_OPTIONS.map((option) => (
                      <option key={option.sourceType} value={option.sourceType}>{option.sourceType}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Activity Quantity *</label>
                  <div className="flex">
                    <input type="number" min="0" step="any" required placeholder="e.g. 425000" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full border border-brand-border p-2.5 rounded-l text-xs bg-brand-offwhite font-mono" />
                    <span className="bg-brand-sage text-brand-forest border-y border-r border-brand-border px-3 rounded-r font-mono font-semibold flex items-center justify-center min-w-16">
                      {unit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Evidence Document (Optional)</label>
                  <input type="text" placeholder="e.g. IOCL_Invoice_778.pdf" value={sourceDocument} onChange={(e) => setSourceDocument(e.target.value)} className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite" />
                </div>
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Internal Notes</label>
                  <input type="text" placeholder="e.g. April generator diesel purchase" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite" />
                </div>
              </div>

              {previewEmissions !== null && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-brand-forest">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-brand-green-sec block">Deterministic Emission Preview</span>
                    <p className="mt-1">
                      {quantity || 0} {unit} x {selectedSource.factor} {selectedSource.factorUnit} = <strong>{previewEmissions.toFixed(4)} tCO2e</strong>
                    </p>
                  </div>
                  <div className="text-left sm:text-right text-brand-charcoal">
                    <span className="text-[10px] text-gray-400 block">Scope Classification</span>
                    <span className="font-bold">{selectedSource.scope === 'scope-2' ? 'Scope 2 Location-Based' : 'Scope 1 Direct'}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={resetActivityForm} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-brand-forest hover:bg-brand-green-sec text-white rounded text-xs font-bold transition-all cursor-pointer">
                  {editingRecordId ? 'Update Activity Record' : 'Commit Activity Record'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-brand-border rounded-xl p-5 space-y-5">
            <form onSubmit={handleProductionSubmit} className="space-y-3 text-xs">
              <h3 className="font-bold text-sm font-mono uppercase tracking-wider text-brand-charcoal flex items-center gap-1">
                <Factory className="w-4 h-4 text-brand-forest" /> Production Output
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Add output records for period-specific carbon intensity. Tonne-based records feed the dashboard intensity calculation.
              </p>

              <select value={productionFacilityId} onChange={(e) => setProductionFacilityId(e.target.value)} className="w-full border border-brand-border p-2.5 rounded bg-white text-xs" required>
                <option value="">Select Facility</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>{facility.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" required value={productionDate} onChange={(e) => setProductionDate(e.target.value)} className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite font-mono" />
                <input type="text" required value={productionReportingPeriod} onChange={(e) => setProductionReportingPeriod(e.target.value)} className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min="0" step="any" required placeholder="Output quantity" value={productionQuantity} onChange={(e) => setProductionQuantity(e.target.value)} className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite font-mono" />
                <input type="text" required value={productionUnit} onChange={(e) => setProductionUnit(e.target.value)} className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite font-mono" />
              </div>
              <input type="text" placeholder="Production evidence document" value={productionSourceDocument} onChange={(e) => setProductionSourceDocument(e.target.value)} className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite" />
              <input type="text" placeholder="Notes" value={productionNotes} onChange={(e) => setProductionNotes(e.target.value)} className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite" />
              <button type="submit" className="w-full px-4 py-2 bg-brand-forest hover:bg-brand-green-sec text-white rounded text-xs font-bold transition-all cursor-pointer">
                Commit Production Output
              </button>
            </form>

            <div className="border-t border-brand-border/60 pt-4 space-y-3">
              <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-brand-charcoal flex items-center gap-1">
                <Upload className="w-4 h-4 text-brand-forest" /> Bulk Utility Ingestion
              </h3>
              <div className="border border-dashed border-brand-border/80 bg-brand-offwhite rounded-lg p-4 text-center">
                <Upload className="w-7 h-7 text-brand-forest mx-auto mb-2 opacity-60" />
                <span className="text-xs font-bold block text-brand-charcoal">Bulk Upload Placeholder</span>
                <span className="text-[10px] text-gray-400 block mt-1 font-mono">CSV/PDF ingestion can attach here later</span>
              </div>
              <button onClick={() => alert('CSV template downloading... Please configure facility IDs, source types, quantities, and units.')} className="w-full text-xs font-mono font-bold bg-white text-brand-charcoal hover:bg-gray-50 border border-brand-border p-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all">
                <FileSpreadsheet className="w-4 h-4 text-brand-forest" /> Download CSV Template
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-brand-border rounded-xl p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-brand-charcoal flex items-center gap-1.5">
            <Factory className="w-4 h-4 text-brand-forest" /> Production Output Records ({productionRecords.length})
          </h2>
          <span className="text-[10px] text-gray-400 font-mono">Used for kgCO2e per tonne calculations</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {productionRecords.slice(0, 6).map((record) => {
            const facilityName = facilities.find((facility) => facility.id === record.facilityId)?.name || 'Unknown facility';
            return (
              <div key={record.id} className="border border-brand-border/70 bg-brand-offwhite rounded-lg p-3 text-xs">
                <div className="font-bold text-brand-charcoal truncate">{facilityName}</div>
                <div className="font-mono text-[10px] text-gray-400 mt-1">{record.date} - {record.reportingPeriod}</div>
                <div className="mt-2 font-mono text-brand-forest font-bold">{Number(record.quantity ?? 0).toLocaleString()} {record.unit}</div>
                <div className="mt-1 text-[10px] text-gray-400 truncate" title={record.sourceDocument}>{record.sourceDocument || 'No evidence attached'}</div>
              </div>
            );
          })}
          {productionRecords.length === 0 && (
            <div className="md:col-span-3 text-center text-gray-400 py-8 font-mono text-xs border border-dashed border-brand-border rounded-lg">
              No production output records yet. Log output beside the activity form to unlock record-based intensity.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-brand-border rounded-xl p-5">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-5 border-b border-brand-border/40 pb-4">
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-brand-charcoal flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-brand-forest" /> Activity Ledger ({filteredRecords.length} entries)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 text-xs w-full xl:w-auto">
            <select value={filterFacility} onChange={(e) => setFilterFacility(e.target.value)} className="border border-brand-border p-2 rounded bg-brand-offwhite text-xs font-mono">
              <option value="all">All Facilities</option>
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>{facility.name.replace(' Manufacturing Plant', '').replace(' Component Facility', '')}</option>
              ))}
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border border-brand-border p-2 rounded bg-brand-offwhite text-xs font-mono">
              <option value="all">All Sources</option>
              {SOURCE_OPTIONS.map((option) => (
                <option key={option.sourceType} value={option.sourceType}>{option.sourceType}</option>
              ))}
            </select>
            <select value={filterScope} onChange={(e) => setFilterScope(e.target.value)} className="border border-brand-border p-2 rounded bg-brand-offwhite text-xs font-mono">
              <option value="all">All Scopes</option>
              <option value="scope-1">Scope 1</option>
              <option value="scope-2">Scope 2</option>
            </select>
            <input value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} placeholder="Reporting period" className="border border-brand-border p-2 rounded bg-brand-offwhite text-xs font-mono" />
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="border border-brand-border p-2 rounded bg-brand-offwhite text-xs font-mono" />
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="border border-brand-border p-2 rounded bg-brand-offwhite text-xs font-mono" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-500">
            <thead className="text-[10px] text-gray-400 uppercase font-mono tracking-wider bg-brand-offwhite border-b border-brand-border">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Facility</th>
                <th className="p-3">Source</th>
                <th className="p-3">Scope</th>
                <th className="p-3 text-right">Quantity</th>
                <th className="p-3 text-right">Emissions</th>
                <th className="p-3">Evidence</th>
                <th className="p-3">Factor Used</th>
                {(onUpdateRecord || onDeleteRecord) && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40">
              {filteredRecords.map((record) => {
                const facilityName = facilities.find((facility) => facility.id === record.facilityId)?.name || 'Unknown';
                const displaySource = record.sourceType || record.energyType;
                const displayEmissions = record.emissionsTCO2e ?? record.emissions ?? 0;
                const factorValue = record.emissionFactorValue ?? record.auditTrail?.emissionFactor ?? 0;
                const factorUnit = record.emissionFactorUnit || record.auditTrail?.factorUnit || '';
                return (
                  <tr key={record.id} className="hover:bg-brand-sage/5 transition-colors">
                    <td className="p-3 font-mono text-brand-charcoal whitespace-nowrap">{record.date}</td>
                    <td className="p-3 font-medium text-brand-charcoal whitespace-nowrap">{facilityName.replace(' Manufacturing Plant', '').replace(' Component Facility', '')}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        record.activityType === 'renewable-electricity' ? 'bg-emerald-100 text-brand-forest' :
                        record.scope === 'scope-2' ? 'bg-amber-100 text-brand-amber' : 'bg-gray-100 text-brand-charcoal'
                      }`}>
                        {displaySource}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-brand-charcoal whitespace-nowrap">{record.scope === 'scope-2' ? 'Scope 2' : 'Scope 1'}</td>
                    <td className="p-3 text-right font-mono text-brand-charcoal whitespace-nowrap">{record.quantity.toLocaleString()} {record.unit}</td>
                    <td className="p-3 text-right font-mono font-bold whitespace-nowrap text-brand-charcoal">{displayEmissions.toFixed(3)} tCO2e</td>
                    <td className="p-3 text-gray-400 font-mono italic whitespace-nowrap truncate max-w-44" title={record.sourceDocument}>{record.sourceDocument}</td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-[10px] font-mono text-gray-400">
                        {factorValue} {factorUnit}
                        <span className="block text-[8px] text-gray-300 italic truncate max-w-44" title={record.auditTrail?.factorSource}>
                          {record.emissionFactorId || record.auditTrail?.emissionFactorId || 'legacy-factor'}
                        </span>
                      </div>
                    </td>
                    {(onUpdateRecord || onDeleteRecord) && (
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {onUpdateRecord && (
                            <button
                              onClick={() => handleEditRecord(record)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded border border-brand-border text-brand-forest hover:bg-brand-sage/20 transition-colors"
                              title="Edit activity record"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteRecord && (
                            <button
                              onClick={() => onDeleteRecord(record.id)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded border border-red-100 text-brand-red hover:bg-red-50 transition-colors"
                              title="Delete activity record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={(onUpdateRecord || onDeleteRecord) ? 9 : 8} className="text-center text-gray-400 py-12 font-mono">
                    No matching activity records registered in this tenant context.
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
