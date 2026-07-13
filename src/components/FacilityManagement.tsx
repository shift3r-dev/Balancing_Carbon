import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, Edit, Trash2, Building, MapPin, Package, Fuel, Zap, 
  RefreshCw, CheckCircle, Scale, ShieldAlert, X, Shield, Copy, Check, Database
} from 'lucide-react';
import { Facility } from '../types.ts';
import EntityMetadataDialog from './EntityMetadataDialog.tsx';

interface FacilityProps {
  facilities: Facility[];
  onAddFacility: (facility: any) => void;
  onUpdateFacility: (id: string, updates: any) => void;
  onDeleteFacility: (id: string) => void;
}

export default function FacilityManagement({ 
  facilities, 
  onAddFacility, 
  onUpdateFacility, 
  onDeleteFacility 
}: FacilityProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [metadataFacility, setMetadataFacility] = useState<Facility | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [productionOutput, setProductionOutput] = useState('');
  const [productionUnit, setProductionUnit] = useState('Tonnes');
  const [electricityConsumption, setElectricityConsumption] = useState('');
  const [fuelConsumption, setFuelConsumption] = useState('');
  const [fuelType, setFuelType] = useState('Diesel');
  const [renewableEnergyUsage, setRenewableEnergyUsage] = useState('');

  // Comparing states
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    if (!showAddModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showAddModal]);

  const handleToggleCompare = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter(cid => cid !== id));
    } else {
      if (compareIds.length < 3) {
        setCompareIds([...compareIds, id]);
      } else {
        alert('You can compare a maximum of 3 facilities side-by-side.');
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setLocation('');
    setIndustryType('');
    setProductionOutput('');
    setProductionUnit('Tonnes');
    setElectricityConsumption('');
    setFuelConsumption('');
    setFuelType('Diesel');
    setRenewableEnergyUsage('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (f: Facility) => {
    setEditingId(f.id);
    setName(f.name);
    setLocation(f.location);
    setIndustryType(f.industryType);
    setProductionOutput(f.productionOutput.toString());
    setProductionUnit(f.productionUnit);
    setElectricityConsumption(f.electricityConsumption.toString());
    setFuelConsumption(f.fuelConsumption.toString());
    setFuelType(f.fuelType);
    setRenewableEnergyUsage(f.renewableEnergyUsage.toString());
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location || !industryType) {
      alert('Please fill out all required fields.');
      return;
    }

    const payload = {
      name,
      location,
      industryType,
      productionOutput: parseFloat(productionOutput) || 0,
      productionUnit,
      electricityConsumption: parseFloat(electricityConsumption) || 0,
      fuelConsumption: parseFloat(fuelConsumption) || 0,
      fuelType,
      renewableEnergyUsage: parseFloat(renewableEnergyUsage) || 0
    };

    if (editingId) {
      onUpdateFacility(editingId, payload);
    } else {
      onAddFacility(payload);
    }
    setShowAddModal(false);
  };

  const comparedFacilities = facilities.filter(f => compareIds.includes(f.id));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-brand-border">
        <div>
          <h1 className="text-xl font-extrabold text-brand-charcoal">Facility Management</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Manage multi-region production plants, emissions intensity, and offset compliance logs.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-brand-forest hover:bg-brand-green-sec text-white px-4 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Factory Unit
        </button>
      </div>

      {/* Facilities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {facilities.map(f => {
          const totalE = f.emissionsScope1 + f.emissionsScope2;
          const renewShare = f.electricityConsumption > 0 ? (f.renewableEnergyUsage / f.electricityConsumption) * 100 : 0;
          const isComparing = compareIds.includes(f.id);

          return (
            <div key={f.id} className="bg-white border border-brand-border rounded-xl shadow-sm p-5 flex flex-col justify-between relative hover:shadow-md transition-all">
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                    f.esgReadinessStatus === 'Excellent' ? 'bg-emerald-100 text-brand-forest' :
                    f.esgReadinessStatus === 'Good' ? 'bg-green-100 text-brand-green-sec' :
                    f.esgReadinessStatus === 'Needs Improvement' ? 'bg-amber-100 text-brand-amber' :
                    'bg-red-100 text-brand-red'
                  }`}>
                    {f.esgReadinessStatus}
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setMetadataFacility(f)} className="p-1.5 text-gray-400 hover:text-brand-forest rounded hover:bg-gray-100" title="Open custom facility profile"><Database className="w-3.5 h-3.5" /></button>
                    <button
                      type="button"
                      onClick={() => handleToggleCompare(f.id)}
                      className={`p-1.5 rounded border text-[10px] font-mono ${
                        isComparing ? 'bg-brand-forest text-white border-brand-forest' : 'bg-brand-offwhite text-gray-500 hover:bg-brand-sage/20 border-brand-border'
                      }`}
                    >
                      Compare
                    </button>
                    <button
                      onClick={() => handleOpenEdit(f)}
                      className="p-1 text-gray-400 hover:text-brand-forest rounded hover:bg-gray-100"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${f.name}?`)) {
                          onDeleteFacility(f.id);
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-brand-red rounded hover:bg-gray-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-brand-charcoal text-sm leading-snug mb-1">{f.name}</h3>
                <div className="mb-2 flex items-center gap-1.5 rounded border border-brand-border bg-brand-offwhite px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-gray-500" title={f.id}>ID: {f.id}</span>
                  <button type="button" onClick={async () => { await navigator.clipboard.writeText(f.id); setCopiedId(f.id); window.setTimeout(() => setCopiedId(null), 1500); }} className="shrink-0 p-1 text-brand-forest hover:bg-brand-sage rounded" title="Copy facility ID">{copiedId === f.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>
                </div>
                <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mb-4">
                  <MapPin className="w-3 h-3 text-gray-400" /> {f.location}
                </div>

                {/* Info Block */}
                <div className="space-y-2 border-t border-brand-border/40 pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Production</span>
                    <span className="font-mono text-brand-charcoal font-semibold">{f.productionOutput.toLocaleString()} {f.productionUnit}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Electricity Usage</span>
                    <span className="font-mono text-brand-charcoal">{f.electricityConsumption.toLocaleString()} kWh</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1"><Fuel className="w-3.5 h-3.5" /> Fuel Consumed</span>
                    <span className="font-mono text-brand-charcoal">{f.fuelConsumption.toLocaleString()} L ({f.fuelType})</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Solar / Renewable</span>
                    <span className="font-mono text-brand-forest">{renewShare.toFixed(0)}% mix</span>
                  </div>
                </div>
              </div>

              {/* Emissions highlights */}
              <div className="mt-5 pt-4 border-t border-brand-border bg-brand-offwhite/50 -mx-5 -mb-5 p-4 rounded-b-xl grid grid-cols-2 text-center">
                <div className="border-r border-brand-border/60">
                  <span className="text-[9px] uppercase font-mono text-gray-400 tracking-wider">Footprint</span>
                  <div className="font-mono font-bold text-sm text-brand-charcoal mt-0.5">{totalE.toFixed(1)} t</div>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-gray-400 tracking-wider">Carbon Intensity</span>
                  <div className="font-mono font-bold text-sm text-brand-charcoal mt-0.5">{(f.carbonIntensity * 1000).toFixed(1)} kg/T</div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Side-by-Side Comparison Section */}
      {compareIds.length > 0 && (
        <div className="bg-white border border-brand-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-brand-border">
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-brand-charcoal flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-brand-forest" /> Side-by-Side Facility Comparison ({compareIds.length})
            </h2>
            <button 
              onClick={() => setCompareIds([])} 
              className="text-[10px] font-mono text-brand-red hover:underline"
            >
              Clear Comparison
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparedFacilities.map(f => (
              <div key={f.id} className="p-4 bg-brand-offwhite rounded-lg border border-brand-border text-xs space-y-3">
                <div className="font-bold text-brand-charcoal border-b border-brand-border/40 pb-1 truncate">{f.name}</div>
                <div className="grid grid-cols-2 gap-y-2">
                  <span className="text-gray-500">Location:</span>
                  <span className="font-mono text-right truncate">{f.location.split(',')[0]}</span>
                  
                  <span className="text-gray-500">Type:</span>
                  <span className="font-mono text-right truncate">{f.industryType}</span>

                  <span className="text-gray-500">Total Emissions:</span>
                  <span className="font-mono font-bold text-right text-brand-charcoal">{(f.emissionsScope1 + f.emissionsScope2).toFixed(1)} tCO2e</span>

                  <span className="text-gray-500">Scope 1 (Direct):</span>
                  <span className="font-mono text-right text-brand-green-sec">{f.emissionsScope1.toFixed(1)} t</span>

                  <span className="text-gray-500">Scope 2 (Electricity):</span>
                  <span className="font-mono text-right text-brand-amber">{f.emissionsScope2.toFixed(1)} t</span>

                  <span className="text-gray-500">Output Production:</span>
                  <span className="font-mono text-right">{f.productionOutput.toLocaleString()} Tons</span>

                  <span className="text-gray-500">Carbon Intensity:</span>
                  <span className="font-mono font-bold text-right text-brand-forest">{(f.carbonIntensity * 1000).toFixed(1)} kg/T</span>

                  <span className="text-gray-500">Renewable Mix:</span>
                  <span className="font-mono text-right text-brand-forest">{f.electricityConsumption > 0 ? ((f.renewableEnergyUsage / f.electricityConsumption) * 100).toFixed(0) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Factory Modal */}
      {showAddModal ? createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 sm:p-4 z-[1000]">
          <div className="bg-white rounded-xl border border-brand-border shadow-2xl max-w-lg w-full max-h-[calc(100svh-1.5rem)] sm:max-h-[calc(100svh-2rem)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="shrink-0 flex justify-between items-center bg-brand-charcoal text-white p-4">
              <h3 className="font-bold text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-brand-forest" /> {editingId ? 'Edit Factory Parameters' : 'Register New Manufacturing Plant'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto p-5 space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Facility Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune Component Facility"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite"
                  />
                </div>
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Location Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chakan, Pune"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Industrial Type / Line *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Forging & Metal Stamping"
                    value={industryType}
                    onChange={(e) => setIndustryType(e.target.value)}
                    className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite"
                  />
                </div>
                <div>
                  <label className="block font-mono text-gray-500 mb-1">Production Unit Output *</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      required
                      placeholder="e.g. 15000"
                      value={productionOutput}
                      onChange={(e) => setProductionOutput(e.target.value)}
                      className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite"
                    />
                    <select
                      value={productionUnit}
                      onChange={(e) => setProductionUnit(e.target.value)}
                      className="border border-brand-border px-2 rounded bg-white text-xs font-mono"
                    >
                      <option value="Tonnes">Tonnes</option>
                      <option value="Pieces">Pieces</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-brand-border/50 my-3 pt-3">
                <span className="text-[10px] font-mono uppercase text-gray-400 tracking-widest font-semibold block mb-2">
                  Carbon Base Load Accounting
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-gray-500 mb-1">Electricity Base (kWh / Yr)</label>
                    <input
                      type="number"
                      placeholder="e.g. 450000"
                      value={electricityConsumption}
                      onChange={(e) => setElectricityConsumption(e.target.value)}
                      className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-gray-500 mb-1">On-site Rooftop Solar (kWh / Yr)</label>
                    <input
                      type="number"
                      placeholder="e.g. 100000"
                      value={renewableEnergyUsage}
                      onChange={(e) => setRenewableEnergyUsage(e.target.value)}
                      className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block font-mono text-gray-500 mb-1">Fuel Consumption (Qty / Yr)</label>
                    <input
                      type="number"
                      placeholder="e.g. 12000"
                      value={fuelConsumption}
                      onChange={(e) => setFuelConsumption(e.target.value)}
                      className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-gray-500 mb-1">Fuel Type</label>
                    <select
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value)}
                      className="w-full border border-brand-border p-2.5 rounded text-xs bg-white font-mono"
                    >
                      <option value="Diesel">Diesel (Litre)</option>
                      <option value="Petrol">Petrol (Litre)</option>
                      <option value="LPG">LPG (kg)</option>
                      <option value="Natural Gas">Natural Gas (m3)</option>
                      <option value="Furnace Oil">Furnace Oil (Litre)</option>
                      <option value="Biomass">Biomass (kg)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-brand-sage/20 border border-brand-border p-3.5 rounded text-gray-600 space-y-1.5 font-mono text-[10px]">
                <strong className="text-brand-forest uppercase flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Deterministic Audit Engine Active
                </strong>
                <p className="leading-snug">
                  By clicking save, Balancing Carbon calculates net Scope 1 stationary combustions and location-based Scope 2 emissions using IPCC 2006 and CEA India v19 emission factor tables.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-forest hover:bg-brand-green-sec text-white rounded text-xs font-bold transition-all cursor-pointer"
                >
                  {editingId ? 'Apply Changes' : 'Register Plant'}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body,
      ) : null}
      {metadataFacility ? <EntityMetadataDialog entityKey="facility" recordId={metadataFacility.id} recordName={metadataFacility.name} onClose={() => setMetadataFacility(null)} /> : null}

    </div>
  );
}
