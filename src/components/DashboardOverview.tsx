import React from 'react';
import { 
  TrendingUp, ShieldCheck, FileCheck, HelpCircle, AlertTriangle, 
  ArrowUpRight, BatteryCharging, Factory, Zap, Flame 
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Facility, EnergyRecord, ESGQuestion, OEMQuestionnaire, Document, ViewState } from '../types.ts';

interface OverviewProps {
  facilities: Facility[];
  records: EnergyRecord[];
  esgQuestions: ESGQuestion[];
  oemSurveys: OEMQuestionnaire[];
  documents: Document[];
  onNavigate: (view: ViewState) => void;
}

export default function DashboardOverview({ 
  facilities, 
  records, 
  esgQuestions, 
  oemSurveys, 
  documents,
  onNavigate 
}: OverviewProps) {

  // Calculations
  const totalScope1 = facilities.reduce((sum, f) => sum + f.emissionsScope1, 0);
  const totalScope2 = facilities.reduce((sum, f) => sum + f.emissionsScope2, 0);
  const totalEmissions = totalScope1 + totalScope2;

  const totalElectricity = facilities.reduce((sum, f) => sum + f.electricityConsumption, 0);
  const totalRenewable = facilities.reduce((sum, f) => sum + f.renewableEnergyUsage, 0);
  const renewableRatio = totalElectricity > 0 ? (totalRenewable / totalElectricity) * 100 : 0;

  const totalProduction = facilities.reduce((sum, f) => sum + f.productionOutput, 0);
  const averageIntensity = totalProduction > 0 ? (totalEmissions / totalProduction) : 0;

  // ESG score calculate
  const esgScoreAverage = Math.round(esgQuestions.reduce((sum, q) => sum + q.score, 0) / (esgQuestions.length || 1) * 10);

  // Chart 1: Monthly emissions trend mock data (representing FY2025-26)
  const emissionsTrendData = [
    { name: 'Q1 Apr-Jun', Scope1: totalScope1 * 0.22, Scope2: totalScope2 * 0.24, Total: (totalScope1 * 0.22 + totalScope2 * 0.24) },
    { name: 'Q2 Jul-Sep', Scope1: totalScope1 * 0.26, Scope2: totalScope2 * 0.25, Total: (totalScope1 * 0.26 + totalScope2 * 0.25) },
    { name: 'Q3 Oct-Dec', Scope1: totalScope1 * 0.28, Scope2: totalScope2 * 0.28, Total: (totalScope1 * 0.28 + totalScope2 * 0.28) },
    { name: 'Q4 Jan-Mar', Scope1: totalScope1 * 0.24, Scope2: totalScope2 * 0.23, Total: (totalScope1 * 0.24 + totalScope2 * 0.23) },
  ];

  // Chart 2: Scope distribution data
  const scopeDistributionData = [
    { name: 'Scope 1 (Direct Fuel)', value: totalScope1 },
    { name: 'Scope 2 (Grid Power)', value: totalScope2 },
    { name: 'Scope 3 (Supply Chain)', value: 150.0 }, // static estimate
  ];

  const SCOPE_COLORS = ['#3F7D58', '#1F5A3D', '#252A27'];

  // Chart 3: Energy source breakdown
  const energyMixData = [
    { name: 'Grid Electricity', value: totalElectricity - totalRenewable },
    { name: 'On-site Solar', value: totalRenewable },
    { name: 'Diesel Fuel', value: facilities.reduce((sum, f) => sum + (f.fuelType === 'Diesel' ? f.fuelConsumption : 0), 0) },
  ];

  const ENERGY_COLORS = ['#C88A32', '#1F5A3D', '#B84A4A'];

  // Chart 4: Facility comparison emissions
  const facilityComparisonData = facilities.map(f => ({
    name: f.name.replace(' Manufacturing Plant', '').replace(' Component Facility', '').replace(' Assembly Unit', ''),
    Scope1: f.emissionsScope1,
    Scope2: f.emissionsScope2,
    Total: f.emissionsScope1 + f.emissionsScope2
  }));

  return (
    <div className="space-y-6">
      
      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-brand-border gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-brand-charcoal tracking-tight">Operational ESG & Carbon Cockpit</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Apex Precision Components Pvt. Ltd. • Reporting Cycle: FY 2025-26
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-brand-sage text-brand-forest border border-brand-border px-3 py-1.5 rounded-lg font-bold">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Multi-Tenant Vault Secures Your ISO 14001 Evidence</span>
        </div>
      </div>

      <div className="bg-brand-charcoal text-white rounded-2xl border border-white/10 p-5 md:p-6 overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '54px 54px'
        }} />
        <div className="relative grid grid-cols-1 lg:grid-cols-4 gap-5 items-center">
          <div className="lg:col-span-2 space-y-2">
            <span className="text-[10px] uppercase tracking-widest font-mono text-brand-sage font-bold">Live Industrial Carbon Command View</span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              {totalEmissions.toLocaleString('en-US', { maximumFractionDigits: 1 })} tCO2e under active audit control
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed max-w-2xl">
              Facility ledgers, evidence folders, OEM response status, and ESG maturity scores are grouped into one operating picture for compliance teams.
            </p>
          </div>

          <div className="grid grid-cols-3 lg:col-span-2 gap-3 text-xs">
            <div className="bg-white/8 border border-white/10 rounded-xl p-4">
              <span className="text-[9px] font-mono uppercase text-gray-400 block">Renewable Mix</span>
              <strong className="text-xl font-mono text-brand-sage">{renewableRatio.toFixed(1)}%</strong>
            </div>
            <div className="bg-white/8 border border-white/10 rounded-xl p-4">
              <span className="text-[9px] font-mono uppercase text-gray-400 block">Carbon Intensity</span>
              <strong className="text-xl font-mono text-brand-sage">{(averageIntensity * 1000).toFixed(1)}</strong>
              <span className="block text-[9px] text-gray-400">kg/t output</span>
            </div>
            <div className="bg-white/8 border border-white/10 rounded-xl p-4">
              <span className="text-[9px] font-mono uppercase text-gray-400 block">Evidence Files</span>
              <strong className="text-xl font-mono text-brand-sage">{documents.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Total Emissions */}
        <div className="bg-white border border-brand-border p-4 rounded-xl flex flex-col justify-between">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold font-mono">Total Emissions</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold text-brand-charcoal font-mono">{totalEmissions.toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>
            <span className="text-xs text-gray-500 font-mono">tCO₂e</span>
          </div>
        </div>

        {/* Scope 1 Direct */}
        <div className="bg-white border border-brand-border p-4 rounded-xl flex flex-col justify-between">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold font-mono">Scope 1 Direct</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold text-brand-charcoal font-mono">{totalScope1.toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>
            <span className="text-xs text-gray-500 font-mono">tCO₂e</span>
          </div>
        </div>

        {/* Scope 2 Grid */}
        <div className="bg-white border border-brand-border p-4 rounded-xl flex flex-col justify-between">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold font-mono">Scope 2 Grid</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold text-brand-charcoal font-mono">{totalScope2.toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>
            <span className="text-xs text-gray-500 font-mono">tCO₂e</span>
          </div>
        </div>

        {/* ESG Readiness */}
        <div className="bg-white border border-brand-border p-4 rounded-xl flex flex-col justify-between">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold font-mono">ESG Readiness</p>
          <div className="flex items-center gap-2 text-brand-forest mt-2">
            <span className="text-2xl font-bold font-mono">{esgScoreAverage}%</span>
            <div className="h-2 flex-1 bg-brand-sage rounded-full overflow-hidden">
              <div className="h-full bg-brand-forest transition-all duration-500" style={{ width: `${esgScoreAverage}%` }}></div>
            </div>
          </div>
        </div>

        {/* Facility Count */}
        <div className="bg-brand-forest border border-brand-forest p-4 rounded-xl flex flex-col justify-between text-white">
          <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold font-mono">Facility Count</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold font-mono">0{facilities.length}</span>
            <span className="text-xs opacity-70 font-mono">Operating</span>
          </div>
        </div>

        {/* Next Reporting */}
        <div className="bg-brand-charcoal border border-brand-charcoal p-4 rounded-xl flex flex-col justify-between text-white">
          <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold font-mono">Next Reporting</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-xl font-bold uppercase font-mono">Q3 FY26</span>
          </div>
        </div>

      </div>

      {/* Grid: Main Charts & Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Card 1: Monthly emissions trend */}
        <div className="bg-white p-6 rounded-2xl border border-brand-border lg:col-span-2 flex flex-col h-96 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold font-mono text-brand-charcoal uppercase tracking-wider">FY 25-26 Emissions Trend by Quarter</h3>
            <span className="text-[10px] font-mono text-gray-400">In tCO₂e</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emissionsTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorS1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3F7D58" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3F7D58" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorS2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1F5A3D" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#1F5A3D" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F0" />
                <XAxis dataKey="name" stroke="#a3a3a3" fontSize={10} fontStyle="italic" />
                <YAxis stroke="#a3a3a3" fontSize={10} />
                <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="Scope1" stroke="#3F7D58" fillOpacity={1} fill="url(#colorS1)" name="Scope 1 (Boilers & Generators)" />
                <Area type="monotone" dataKey="Scope2" stroke="#1F5A3D" fillOpacity={1} fill="url(#colorS2)" name="Scope 2 (Grid Electricity)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart Card 2: Scope breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-brand-border flex flex-col h-96 shadow-sm hover:shadow-md transition-all duration-300">
          <h3 className="text-xs font-bold font-mono text-brand-charcoal uppercase tracking-wider mb-4">Emissions Scope Distribution</h3>
          <div className="flex-1 min-h-0 flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={scopeDistributionData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {scopeDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SCOPE_COLORS[index % SCOPE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} layout="vertical" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Grid: More charts (Energy Mix & Facility Comparison) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 3: Facility Comparison Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-brand-border flex flex-col h-80 shadow-sm hover:shadow-md transition-all duration-300">
          <h3 className="text-xs font-bold font-mono text-brand-charcoal uppercase tracking-wider mb-4">Footprint Comparison Across Operating Facilities</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={facilityComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F0" />
                <XAxis dataKey="name" stroke="#a3a3a3" fontSize={10} />
                <YAxis stroke="#a3a3a3" fontSize={10} />
                <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Scope1" fill="#3F7D58" stackId="a" name="Scope 1 Direct" />
                <Bar dataKey="Scope2" fill="#1F5A3D" stackId="a" name="Scope 2 Electricity" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Energy Mix Source Chart */}
        <div className="bg-white p-6 rounded-2xl border border-brand-border flex flex-col h-80 shadow-sm hover:shadow-md transition-all duration-300">
          <h3 className="text-xs font-bold font-mono text-brand-charcoal uppercase tracking-wider mb-4">Plant Fuel & Power Energy Source Breakdown</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={energyMixData}
                  cx="50%"
                  cy="45%"
                  outerRadius={75}
                  dataKey="value"
                  label={({ name, percent }) => `${name.replace(' Fuel', '')} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  style={{ fontSize: 9, fontFamily: 'monospace' }}
                >
                  {energyMixData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ENERGY_COLORS[index % ENERGY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Compliance Center & Quick Action Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pending OEM Questionnaires Survey card */}
        <div className="bg-white p-6 rounded-2xl border border-brand-border flex flex-col h-96 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold font-mono text-brand-charcoal uppercase tracking-wider">OEM Survey Status</h3>
            <button 
              onClick={() => onNavigate('dashboard-questionnaires')} 
              className="text-[10px] font-mono text-brand-forest hover:underline"
            >
              Configure Workflow →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {oemSurveys.map(survey => (
              <div key={survey.id} className="p-3.5 bg-brand-offwhite rounded-xl border border-brand-border/80">
                <div className="flex justify-between items-start gap-3">
                  <h4 className="text-xs font-bold text-brand-charcoal leading-snug">{survey.title}</h4>
                  <span className={`text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded ${
                    survey.status === 'Completed' ? 'bg-brand-sage text-brand-forest' : 'bg-amber-50 text-brand-amber'
                  }`}>
                    {survey.status}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono mt-2">Client: {survey.oemName}</div>
                <div className="text-[10px] text-gray-400 font-mono mt-1">Due: {survey.dueDate}</div>

                {/* Progress bar inside */}
                <div className="mt-3 pt-3 border-t border-brand-border/40">
                  <div className="flex justify-between text-[9px] font-mono text-gray-400 mb-1">
                    <span>Evidence Mapped</span>
                    <span>{survey.questions.filter(q => q.status === 'Approved').length} of {survey.questions.length} Questions</span>
                  </div>
                  <div className="h-1 bg-brand-border rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-forest" 
                      style={{ width: `${(survey.questions.filter(q => q.status === 'Approved').length / (survey.questions.length || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regulatory Risk Indicators / CTO Warning */}
        <div className="bg-white p-6 rounded-2xl border border-brand-border flex flex-col h-96 shadow-sm hover:shadow-md transition-all duration-300">
          <h3 className="text-xs font-bold font-mono text-brand-charcoal uppercase tracking-wider mb-4 text-brand-amber flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Compliance Alert Center
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            
            {/* Warning 1: Pune CTO */}
            <div className="p-3 bg-brand-offwhite border-l-4 border-brand-amber rounded-r-xl">
              <strong className="text-brand-charcoal block mb-0.5 font-medium">MPCB Permit Pending Chakan Unit</strong>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                The Pune stamping unit CTO (Consent to Operate) application is currently awaiting formal State Pollution Board approval. Running lines on the expired permit receipt is acceptable for local audit but poses risk for European export certifications.
              </p>
              <div className="mt-2 text-[10px] font-mono text-brand-amber">Action: Contact regional SPCB consultant.</div>
            </div>

            {/* Warning 2: Supplier Code */}
            <div className="p-3 bg-brand-offwhite border-l-4 border-brand-red rounded-r-xl">
              <strong className="text-brand-charcoal block mb-0.5 font-medium">Draft Supplier Code Lacks Signatures</strong>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Supplier compliance readiness is blocked because your top steel sheet vendors haven't executed the fair wages and child labor code.
              </p>
              <div className="mt-2 text-[10px] font-mono text-brand-red">Action: Push signatures in supply chain.</div>
            </div>

          </div>
        </div>

        {/* Document Quick Vault */}
        <div className="bg-white p-6 rounded-2xl border border-brand-border flex flex-col h-96 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold font-mono text-brand-charcoal uppercase tracking-wider">Document Vault Index</h3>
            <button 
              onClick={() => onNavigate('dashboard-documents')} 
              className="text-[10px] font-mono text-brand-forest hover:underline"
            >
              Open Vault →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {documents.slice(0, 5).map(doc => (
              <div key={doc.id} className="p-3 bg-brand-offwhite hover:bg-brand-sage/10 rounded-lg border border-brand-border/60 transition-all text-xs flex justify-between items-center">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-brand-charcoal truncate font-semibold">{doc.name}</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">{doc.category} • {doc.size}</div>
                </div>
                <span className="text-[9px] font-mono bg-brand-sage text-brand-forest px-1.5 py-0.5 rounded ml-2 whitespace-nowrap font-bold">
                  Verified
                </span>
              </div>
            ))}
            {documents.length === 0 && (
              <div className="text-center text-gray-400 py-12 text-xs font-mono">
                No active compliance documents found in standard tenant index.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
