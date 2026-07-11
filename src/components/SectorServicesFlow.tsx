import React, { useState } from "react";
import { 
  INDUSTRY_SECTORS, 
  SUSTAINABILITY_SERVICES, 
  SustainabilityService 
} from "../data/servicesData";
import { 
  Flame, 
  Layers, 
  Cpu, 
  Droplet, 
  Award, 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Info, 
  Settings, 
  Sparkles 
} from "lucide-react";
import CalculatedDashboard from "./CalculatedDashboard";
import RegistryUnitInput from "./RegistryUnitInput";

export default function SectorServicesFlow() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [calculatorInputs, setCalculatorInputs] = useState<Record<string, any>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  // Sector Icon Matcher
  const getSectorIcon = (name: string) => {
    switch (name) {
      case "Flame": return Flame;
      case "Layers": return Layers;
      case "Cpu": return Cpu;
      case "Droplet": return Droplet;
      case "Award": return Award;
      case "Building2": return Building2;
      default: return ShieldCheck;
    }
  };

  // Get active configurations
  const selectedSector = INDUSTRY_SECTORS.find(s => s.id === selectedSectorId);
  const applicableServices = selectedSector 
    ? SUSTAINABILITY_SERVICES.filter(ser => selectedSector.services.includes(ser.id))
    : [];
  const selectedService = SUSTAINABILITY_SERVICES.find(ser => ser.id === selectedServiceId);

  // Handle Sector Click
  const handleSelectSector = (sectorId: string) => {
    setSelectedSectorId(sectorId);
    setSelectedServiceId(null);
    setStep(2);
  };

  // Handle Service Click
  const handleSelectService = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = SUSTAINABILITY_SERVICES.find(s => s.id === serviceId);
    if (service) {
      // Pre-populate default values
      const defaults: Record<string, any> = {};
      service.calculatorConfig.inputs.forEach(input => {
        defaults[input.id] = input.defaultValue;
      });
      setCalculatorInputs(defaults);
    }
    setStep(3);
  };

  // Handle Input Changes
  const handleInputChange = (id: string, val: any) => {
    setCalculatorInputs(prev => ({ ...prev, [id]: val }));
  };

  // Trigger Calculation Progress
  const handleRunCalculator = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      setStep(4);
    }, 1200);
  };

  // Reset/Restart the flow
  const handleReset = () => {
    setStep(1);
    setSelectedSectorId(null);
    setSelectedServiceId(null);
    setCalculatorInputs({});
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8" id="sector-services-workspace">
      {/* Dynamic Title and Step Progress Indicator */}
      <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Sector-First Services & Calculators
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Diagnose by manufacturing sector first, select tailored sustainability services, calculate parameters, and print your report.
          </p>
        </div>

        {/* Horizontal Step Train */}
        <div className="flex items-center space-x-1.5 text-xs font-bold" id="step-train-container">
          {[
            { nr: 1, label: "Sector" },
            { nr: 2, label: "Service" },
            { nr: 3, label: "Calculate" },
            { nr: 4, label: "Dashboard" }
          ].map((item) => (
            <React.Fragment key={item.nr}>
              <div className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border transition-all ${
                step === item.nr 
                  ? "bg-slate-900 text-white border-slate-900" 
                  : step > item.nr 
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                    : "bg-white text-slate-400 border-slate-200"
              }`}>
                <span className="text-[10px] font-mono">{item.nr}</span>
                <span>{item.label}</span>
              </div>
              {item.nr < 4 && <ArrowRight className="h-3 w-3 text-slate-300" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STEP 1: Select Industry Sector */}
      {step === 1 && (
        <div className="space-y-6" id="step1-sectors">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-display text-base font-bold text-slate-900">Step 1: Select Your Core Manufacturing Sector</h2>
            <p className="text-xs text-slate-500 mt-1">
              Regulations, emission guidelines, and auditing methodologies are tailored directly to each specific industry profile.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRY_SECTORS.map((sector) => {
              const Icon = getSectorIcon(sector.iconName);
              return (
                <div
                  key={sector.id}
                  id={`sector-card-${sector.id}`}
                  onClick={() => handleSelectSector(sector.id)}
                  className="group relative bg-white border border-slate-200 hover:border-slate-900 hover:shadow-md rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-900 border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${
                        sector.relevance === "HIGH" 
                          ? "bg-red-50 text-red-700 border-red-150" 
                          : "bg-amber-50 text-amber-700 border-amber-150"
                      }`}>
                        {sector.relevance} Relevance
                      </span>
                      <h3 className="mt-2.5 font-display text-sm font-bold text-slate-900">{sector.name}</h3>
                      <p className="mt-1.5 text-xs text-slate-500 leading-relaxed font-medium line-clamp-3">{sector.urgencyDescription}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between text-[11px] font-bold text-slate-900">
                    <span>Explore Tailored Services ({sector.services.length})</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: Select Service under Sector */}
      {step === 2 && selectedSector && (
        <div className="space-y-6" id="step2-services">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sector Selected: {selectedSector.name}</span>
              <h2 className="font-display text-base font-bold text-slate-900 mt-0.5">Step 2: Choose What Compliance Service You Want</h2>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-white"
            >
              Change Sector
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {applicableServices.map((service) => (
              <div
                key={service.id}
                id={`service-card-${service.id}`}
                onClick={() => handleSelectService(service.id)}
                className="group bg-white border border-slate-200 hover:border-slate-900 hover:shadow-md rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[9px] font-bold text-slate-700 uppercase">
                      {service.scope}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      {service.frameworkId.replace("-", " ").toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-slate-950 transition-colors">
                      {service.name}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500 font-medium">
                      {service.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between text-[11px] font-bold text-slate-900">
                  <span>Open Custom Calculation Engine</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: Interactive Calculator Form */}
      {step === 3 && selectedSector && selectedService && (
        <div className="space-y-6" id="step3-calculator">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {selectedSector.name} • {selectedService.name}
              </span>
              <h2 className="font-display text-base font-bold text-slate-900 mt-0.5">Step 3: Calculate & Evaluate Service Parameters</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-white"
              >
                Back to Services
              </button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-12 items-start">
            {/* Inputs Form */}
            <form onSubmit={handleRunCalculator} className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">{selectedService.calculatorConfig.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{selectedService.calculatorConfig.description}</p>
              </div>

              <div className="space-y-4">
                {selectedService.calculatorConfig.inputs.map((input) => (
                  <div key={input.id} className="space-y-1.5">
                    {input.type === "number" ? (
                      <RegistryUnitInput id={`calc-input-${input.id}`} label={input.label} unit={input.unit} value={Number(calculatorInputs[input.id] ?? 0)} onChange={(value) => handleInputChange(input.id, value)} />
                    ) : (
                      <select
                        id={`calc-input-${input.id}`}
                        value={calculatorInputs[input.id] || ""}
                        onChange={(e) => handleInputChange(input.id, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        {input.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isCalculating}
                className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm disabled:bg-slate-300"
              >
                {isCalculating ? (
                  <span className="flex items-center justify-center space-x-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Crunching Emission Vectors & Aligning VVB Models...</span>
                  </span>
                ) : (
                  <span>Evaluate Service & Generate Report</span>
                )}
              </button>
            </form>

            {/* Calculations Guidance details */}
            <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-emerald-400 animate-spin-slow" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Audit Compliance Engine</span>
              </div>
              <h3 className="font-display font-bold text-base leading-snug">Cradle-to-Gate Traceable Inventory Audits</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Our calculation models use local emission factors released by the Ministry of Power (CEA India) and IPCC Guidelines. By submitting these indicators, you can bypass manual carbon spreadsheet compilations.
              </p>
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Outputs 100% compliant with ISO 14064 verification protocols.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Creates instant auditable documentation with verifiable hash.</span>
                </div>
              </div>
              <div className="rounded-xl bg-slate-950 p-3.5 text-[10px] text-slate-400 border border-slate-800 leading-relaxed">
                ℹ After evaluation completes, you'll receive a detailed certified PDF download option alongside the dynamic diagnostics dashboard containing breakdown trends.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Full Dashboard and PDF Results */}
      {step === 4 && selectedSector && selectedService && (
        <CalculatedDashboard
          sectorName={selectedSector.name}
          serviceName={selectedService.name}
          inputs={calculatorInputs}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
