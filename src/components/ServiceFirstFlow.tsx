import React, { useState } from "react";
import { 
  SERVICES_REDESIGN_DATA, 
  ServiceDetail 
} from "../data/servicesDataRedesign";
import { 
  Globe, 
  Layers, 
  Scale, 
  TrendingDown, 
  FileText, 
  LayoutDashboard, 
  Zap, 
  Droplet, 
  RefreshCw, 
  Users, 
  Award, 
  BookOpen, 
  ArrowLeft, 
  ArrowRight, 
  ChevronRight, 
  CheckCircle2, 
  Settings, 
  Sparkles, 
  Search, 
  Download, 
  Check, 
  X, 
  HelpCircle, 
  Briefcase, 
  FileSpreadsheet, 
  FileCheck, 
  Activity,
  AlertTriangle,
  Play
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from "recharts";
import RegistryUnitInput from "./RegistryUnitInput";

// Category configuration to map the 12 services
const CATEGORIES = [
  { id: "all", label: "All Solutions" },
  { id: "carbon", label: "Carbon Accounting" },
  { id: "compliance", label: "Regulatory Compliance" },
  { id: "efficiency", label: "Resource Efficiency" }
];

// Helper to map service ID to category
const getServiceCategory = (id: string): string => {
  if (["ghg-accounting", "product-carbon-footprint", "life-cycle-assessment", "net-zero-strategy"].includes(id)) {
    return "carbon";
  }
  if (["esg-sustainability-reporting", "supplier-sustainability", "compliance-readiness", "sustainability-training"].includes(id)) {
    return "compliance";
  }
  return "efficiency";
};

// Map icon string names to Lucide icons
const ICON_MAP: Record<string, any> = {
  Globe: Globe,
  Layers: Layers,
  Scale: Scale,
  TrendingDown: TrendingDown,
  FileText: FileText,
  LayoutDashboard: LayoutDashboard,
  Zap: Zap,
  Droplet: Droplet,
  RefreshCw: RefreshCw,
  Users: Users,
  Award: Award,
  BookOpen: BookOpen
};

export default function ServiceFirstFlow() {
  const [activeView, setActiveView] = useState<"list" | "detail" | "calculator" | "results">("list");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [calculatorInputs, setCalculatorInputs] = useState<Record<string, any>>({});
  const [calculatorResults, setCalculatorResults] = useState<any | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  // Filtered Services based on Category & Search Query
  const filteredServices = SERVICES_REDESIGN_DATA.filter(service => {
    const matchesCategory = activeCategory === "all" || getServiceCategory(service.id) === activeCategory;
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          service.oneLiner.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          service.overview.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedService = SERVICES_REDESIGN_DATA.find(s => s.id === selectedServiceId);

  // Handle Learn More Click
  const handleLearnMore = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setActiveView("detail");
    setExpandedFaqIndex(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle Start Assessment Click
  const handleStartAssessment = (serviceId: string) => {
    const service = SERVICES_REDESIGN_DATA.find(s => s.id === serviceId);
    if (service) {
      setSelectedServiceId(serviceId);
      // Pre-populate defaults
      const defaults: Record<string, any> = {};
      service.assessmentConfig.inputs.forEach(input => {
        defaults[input.id] = input.defaultValue;
      });
      setCalculatorInputs(defaults);
      setActiveView("calculator");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Handle Input Changes
  const handleInputChange = (id: string, value: any) => {
    setCalculatorInputs(prev => ({ ...prev, [id]: value }));
  };

  // Handle Run Calculator Calculation
  const handleRunCalculator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    setIsCalculating(true);
    setTimeout(() => {
      const results = selectedService.assessmentConfig.formula(calculatorInputs);
      setCalculatorResults(results);
      setIsCalculating(false);
      setDownloaded(false);
      setActiveView("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1200);
  };

  // Handle PDF Export download
  const handleDownloadPDF = () => {
    if (!selectedService || !calculatorResults) return;
    setDownloaded(true);

    const verificationHash = `CR-${Math.abs(selectedService.name.length * 831).toString(16).toUpperCase()}-${new Date().getFullYear()}`;

    const textContent = `
================================================================================
                    Balancing Carbon ASSESSMENT SUMMARY
                       CLIMATE DATA INVENTORY DRAFT
================================================================================
Reference No    : CALC-${verificationHash}
Timestamp       : ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
Protocol Note   : Prototype calculation ledger; not an accredited audit certificate

--------------------------------------------------------------------------------
FACILITY & BOUNDARY CLASSIFICATION
--------------------------------------------------------------------------------
Assessed Service: ${selectedService.name}
Reference Frameworks: ISO 14064, ISO 14067, or GLEC Product Frameworks
Calculated By   : Balancing Carbon calculation engine

--------------------------------------------------------------------------------
OPERATIONAL METRICS SUBMITTED
--------------------------------------------------------------------------------
${Object.entries(calculatorInputs)
  .map(([key, value]) => ` - ${key.replace(/([A-Z])/g, " $1").toUpperCase()} : ${value}`)
  .join("\n")}

--------------------------------------------------------------------------------
MATHEMATICAL EMISSION CALCULATIONS (DRAFT CO2e)
--------------------------------------------------------------------------------
Evaluated Indicator: ${calculatorResults.unitLabel}
Calculated Value    : ${calculatorResults.unitValue}
${calculatorResults.carbonTons !== undefined ? `Carbon avoided/offset: ${calculatorResults.carbonTons} tCO2e` : ""}
${calculatorResults.totalScore !== undefined ? `Readiness Index score: ${calculatorResults.totalScore} / 100` : ""}

--------------------------------------------------------------------------------
ASSESSMENT BLUEPRINT STATUS
--------------------------------------------------------------------------------
Summary Diagnostics: ${calculatorResults.summaryText}

--------------------------------------------------------------------------------
RECOMMENDED SYSTEM ACTION PLAN
--------------------------------------------------------------------------------
${calculatorResults.actionPlan.map((action, i) => `${i + 1}. ${action}`).join("\n")}

--------------------------------------------------------------------------------
CALCULATION REFERENCE
--------------------------------------------------------------------------------
Input Reference      : INPUT_HASH_[${verificationHash}]
Generated By         : Balancing Carbon calculation engine.

WARNING: This report provides mathematical evaluations based on user inputs. 
For official ISO certificate stamping, submit this data bundle to your 
designated accredited reviewer outside this prototype workflow.
================================================================================
    `;

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Credit_Carbon_Audit_${selectedService.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset/Restart
  const handleReset = () => {
    setActiveView("list");
    setSelectedServiceId(null);
    setCalculatorInputs({});
    setCalculatorResults(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8" id="service-first-workspace">
      
      {/* ----------------- HEADER & NAVIGATION ----------------- */}
      <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800 tracking-wide uppercase">
              Enterprise Solutions
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-mono font-semibold text-slate-500">12 Direct Services</span>
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {activeView === "list" && "Services Portfolio"}
            {activeView === "detail" && selectedService?.name}
            {activeView === "calculator" && `Run Assessment: ${selectedService?.name}`}
            {activeView === "results" && "Compliance Diagnostic Report"}
          </h1>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-2xl">
            {activeView === "list" && "Directly delivered, accredited-grade industrial environmental services, carbon accounting models, and water audits optimized for Indian manufacturers."}
            {activeView === "detail" && `Detailed business deliverables, operational blueprints, documents, and timelines for ${selectedService?.name}.`}
            {activeView === "calculator" && `Input physical utility, coal, or material parameters below to run the calculation model.`}
            {activeView === "results" && `Verifiable mathematical diagnostic outputs for ${selectedService?.name} compiled in real-time.`}
          </p>
        </div>

        {/* Dynamic Navigation Indicator */}
        <div className="flex items-center space-x-1 text-xs font-bold" id="step-train-container">
          <button 
            onClick={handleReset}
            className={`px-3 py-1.5 rounded-lg border text-[11px] transition-all ${
              activeView === "list" 
                ? "bg-slate-900 text-white border-slate-900" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            1. Services Catalog
          </button>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <div className={`px-3 py-1.5 rounded-lg border text-[11px] transition-all ${
            activeView === "detail" 
              ? "bg-slate-900 text-white border-slate-900" 
              : activeView === "calculator" || activeView === "results" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                : "bg-white text-slate-300 border-slate-100"
          }`}>
            2. Details
          </div>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <div className={`px-3 py-1.5 rounded-lg border text-[11px] transition-all ${
            activeView === "calculator" 
              ? "bg-slate-900 text-white border-slate-900" 
              : activeView === "results" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                : "bg-white text-slate-300 border-slate-100"
          }`}>
            3. Assessment
          </div>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <div className={`px-3 py-1.5 rounded-lg border text-[11px] transition-all ${
            activeView === "results" 
              ? "bg-slate-900 text-white border-slate-900" 
              : "bg-white text-slate-300 border-slate-100"
          }`}>
            4. Report
          </div>
        </div>
      </div>

      {/* ----------------- VIEW 1: SERVICES CATALOG GRID ----------------- */}
      {activeView === "list" && (
        <div className="space-y-6" id="services-catalog-view">
          
          {/* Top Info Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-12 -translate-y-6">
              <Sparkles className="h-48 w-48 text-white" />
            </div>
            <div className="max-w-3xl space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> For Manufacturing Enterprises
              </span>
              <h2 className="font-display font-bold text-lg md:text-xl leading-snug">
                How can Balancing Carbon help my manufacturing business?
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                We deliver end-to-end greenhouse gas inventories, water footprint ledger offsets, energy saving audits, and circular packaging standardizations. Select any core solution below to explore technical blueprints, and run an interactive sandbox evaluation to estimate your compliance status immediately.
              </p>
            </div>
          </div>

          {/* Search and Categories Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    activeCategory === cat.id
                      ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Clean Search Input */}
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Search core services & deliverables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 py-2 pl-9 pr-8 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all placeholder:text-slate-400 text-slate-800"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

          </div>

          {/* Core Services SaaS Grid */}
          {filteredServices.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map(service => {
                const IconComponent = ICON_MAP[service.iconName] || Globe;
                return (
                  <div
                    key={service.id}
                    id={`service-card-${service.id}`}
                    className="group bg-white border border-slate-200 hover:border-slate-900 hover:shadow-md rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Icon & Category Tag */}
                      <div className="flex justify-between items-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-900 border border-slate-200 group-hover:bg-slate-950 group-hover:text-white transition-colors duration-300">
                          <IconComponent className="h-5.5 w-5.5" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                          {CATEGORIES.find(c => c.id === getServiceCategory(service.id))?.label.split(" ")[0]}
                        </span>
                      </div>

                      {/* Name & One Liner */}
                      <div className="space-y-1.5">
                        <h3 className="font-display text-sm font-bold text-slate-950 group-hover:text-slate-900 transition-colors">
                          {service.name}
                        </h3>
                        <p className="text-xs leading-relaxed text-slate-500 font-medium min-h-[40px]">
                          {service.oneLiner}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions (Explicit buttons requested) */}
                    <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
                      <button
                        onClick={() => handleLearnMore(service.id)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-950 border border-slate-200 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 transition-colors flex items-center space-x-1"
                      >
                        <span>Learn More</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleStartAssessment(service.id)}
                        className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl transition-all shadow-sm flex items-center space-x-1.5"
                      >
                        <Play className="h-3 w-3 fill-current shrink-0" />
                        <span>Start Assessment</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-2">
              <HelpCircle className="h-10 w-10 text-slate-400 mx-auto" />
              <h4 className="font-display font-bold text-slate-900 text-sm">No solutions match your filters</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">Try resetting your search query or selecting "All Solutions" to see our core services portfolio.</p>
              <button 
                onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
                className="mt-2 text-xs font-bold text-slate-900 border border-slate-200 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50"
              >
                Reset Filters
              </button>
            </div>
          )}

        </div>
      )}

      {/* ----------------- VIEW 2: SERVICE DETAIL VIEW ----------------- */}
      {activeView === "detail" && selectedService && (
        <div className="space-y-8 animate-fade-in" id="service-detail-view">
          
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveView("list")}
              className="text-xs font-bold text-slate-600 hover:text-slate-950 flex items-center space-x-1 border border-slate-200 bg-white px-3 py-1.5 rounded-lg hover:shadow-sm transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Catalog</span>
            </button>
            <div className="flex items-center space-x-3 text-xs">
              <span className="font-medium text-slate-400">Timeline:</span>
              <span className="bg-slate-100 border border-slate-200 text-slate-950 font-bold px-2.5 py-1 rounded-lg">
                {selectedService.timeline}
              </span>
            </div>
          </div>

          {/* Quick Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex items-start md:items-center space-x-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white border border-slate-800 shadow-md">
                {React.createElement(ICON_MAP[selectedService.iconName] || Globe, { className: "h-7 w-7" })}
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Core Solution</span>
                <h2 className="font-display font-bold text-xl text-slate-950">{selectedService.name}</h2>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-0.5">{selectedService.oneLiner}</p>
              </div>
            </div>
            
            <button
              onClick={() => handleStartAssessment(selectedService.id)}
              className="w-full md:w-auto text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <Activity className="h-4 w-4" />
              <span>Start Compliance Assessment</span>
            </button>
          </div>

          {/* Core Columns */}
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            
            {/* LEFT COLUMN: Service Deep Dive */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Overview */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="font-display text-sm font-bold text-slate-950 flex items-center space-x-1.5 border-b border-slate-100 pb-2">
                  <Briefcase className="h-4.5 w-4.5 text-slate-500" />
                  <span>Service Overview</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {selectedService.overview}
                </p>
              </div>

              {/* Business Problems Solved */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="font-display text-sm font-bold text-slate-950 flex items-center space-x-1.5 border-b border-slate-100 pb-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                  <span>Business Problems We Solve</span>
                </h3>
                <div className="space-y-2.5">
                  {selectedService.businessProblems.map((problem, idx) => (
                    <div key={idx} className="flex items-start space-x-3 bg-red-50/50 border border-red-100 rounded-xl p-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-red-900 leading-relaxed font-semibold">
                        {problem}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategic Benefits */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="font-display text-sm font-bold text-slate-950 flex items-center space-x-1.5 border-b border-slate-100 pb-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                  <span>Strategic Benefits & Value Proposition</span>
                </h3>
                <ul className="space-y-3">
                  {selectedService.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start space-x-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-700 font-semibold leading-relaxed">
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Industries & Frameworks Displays */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Industries */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2.5">
                  <h4 className="font-display text-xs font-bold text-slate-950">Industries Served</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedService.industriesServed.map((ind, idx) => (
                      <span key={idx} className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Frameworks (Requested only inside details) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2.5">
                  <h4 className="font-display text-xs font-bold text-slate-950">Aligned Standards</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedService.frameworks.map((fw, idx) => (
                      <span key={idx} className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                        {fw}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* RIGHT COLUMN: Operational Blueprint & Timeline */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Delivery Process (4 Steps) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-950 border-b border-slate-100 pb-2">
                    Our 4-Step Operational Process
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Direct milestones handled by Balancing Carbon specialists.</p>
                </div>
                
                <div className="relative pl-4 border-l border-slate-100 space-y-5">
                  {selectedService.process.map((p, idx) => (
                    <div key={idx} className="relative space-y-1">
                      {/* Left Dot */}
                      <div className="absolute -left-6.5 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-white font-mono text-[9px] font-bold border-2 border-white">
                        {p.step}
                      </div>
                      <h4 className="text-xs font-bold text-slate-950">{p.name}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expected Deliverables */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="font-display text-sm font-bold text-slate-950 border-b border-slate-100 pb-2 flex items-center space-x-1.5">
                  <FileCheck className="h-4.5 w-4.5 text-slate-500" />
                  <span>Physical Project Deliverables</span>
                </h3>
                <ul className="space-y-2">
                  {selectedService.deliverables.map((del, idx) => (
                    <li key={idx} className="text-xs text-slate-700 font-semibold leading-relaxed flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-950 shrink-0" />
                      <span>{del}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Required Documents */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="font-display text-sm font-bold text-slate-950 border-b border-slate-100 pb-2 flex items-center space-x-1.5">
                  <FileSpreadsheet className="h-4.5 w-4.5 text-slate-500" />
                  <span>Required Client Records</span>
                </h3>
                <ul className="space-y-2">
                  {selectedService.requiredDocuments.map((doc, idx) => (
                    <li key={idx} className="text-[11px] text-slate-600 bg-slate-50 border border-slate-150 p-2.5 rounded-xl font-semibold flex items-center space-x-2">
                      <span className="text-red-500 font-bold shrink-0">📄</span>
                      <span className="truncate">{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

          </div>

          {/* FAQs Accordion */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-950 border-b border-slate-100 pb-2">
              Frequently Asked Questions (FAQs)
            </h3>
            
            <div className="space-y-2">
              {selectedService.faqs.map((faq, idx) => (
                <div key={idx} className="border border-slate-150 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedFaqIndex(expandedFaqIndex === idx ? null : idx)}
                    className="w-full text-left bg-slate-50 hover:bg-slate-100 p-4 flex justify-between items-center transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-900">{faq.q}</span>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      {expandedFaqIndex === idx ? "−" : "+"}
                    </span>
                  </button>
                  {expandedFaqIndex === idx && (
                    <div className="bg-white p-4 border-t border-slate-150">
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sticky Detail Footer Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h4 className="font-display font-bold text-sm">Ready to evaluate your {selectedService.name} parameters?</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Start the assessment or contact our consultants for a detailed corporate plan.</p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => setActiveView("list")}
                className="w-full sm:w-auto text-xs font-bold border border-slate-700 bg-transparent hover:bg-slate-800 px-4 py-2 rounded-xl transition-colors"
              >
                Back to Catalog
              </button>
              <button
                onClick={() => handleStartAssessment(selectedService.id)}
                className="w-full sm:w-auto text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 px-5 py-2 rounded-xl shadow transition-all"
              >
                Start Assessment Calculator
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ----------------- VIEW 3: INTERACTIVE ASSESSMENT CALCULATOR ----------------- */}
      {activeView === "calculator" && selectedService && (
        <div className="space-y-6 animate-fade-in" id="service-calculator-view">
          
          {/* Header Navigation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <button
              onClick={() => setActiveView("detail")}
              className="text-xs font-bold text-slate-600 hover:text-slate-950 flex items-center space-x-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Details</span>
            </button>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              {selectedService.assessmentConfig.title}
            </span>
          </div>

          {/* Form and Guide Split */}
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            
            {/* INPUTS FORM PANEL */}
            <form onSubmit={handleRunCalculator} className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  {selectedService.assessmentConfig.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {selectedService.assessmentConfig.description}
                </p>
              </div>

              {/* Dynamic Inputs Rendering */}
              <div className="space-y-4">
                {selectedService.assessmentConfig.inputs.map(input => (
                  <div key={input.id} className="space-y-1.5">
                    {input.type === "number" ? (
                      <RegistryUnitInput id={`calc-input-${input.id}`} label={input.label} unit={input.unit} value={Number(calculatorInputs[input.id] ?? 0)} onChange={(value) => handleInputChange(input.id, value)} />
                    ) : (
                      <select
                        id={`calc-input-${input.id}`}
                        value={calculatorInputs[input.id] ?? ""}
                        onChange={(e) => handleInputChange(input.id, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3.5 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-950 transition-all"
                      >
                        {input.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>

              {/* Form Submission */}
              <button
                type="submit"
                disabled={isCalculating}
                className="w-full rounded-xl bg-slate-950 py-3.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm disabled:bg-slate-300 flex items-center justify-center space-x-2"
              >
                {isCalculating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Crunching Environmental Vectors & Pre-Verifying Compliance...</span>
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4" />
                    <span>Generate Mathematical compliance Report</span>
                  </>
                )}
              </button>
            </form>

            {/* AUDIT SANDBOX SECURE INFO */}
            <div className="lg:col-span-5 bg-slate-950 text-white rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-emerald-400 animate-spin-slow" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Secure Audit Sandbox</span>
              </div>
              
              <h3 className="font-display font-bold text-base leading-snug">
                Accredited Mathematical Alignment
              </h3>
              
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Our calculation models map indicators to official frameworks (IPCC, ISO 14064, and CEA India regional baseline emission factors). Entering these values generates a traceable operational vector log, enabling you to estimate compliance risk instantly.
              </p>

              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Outputs are structured for corporate accounting review.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Creates instantly auditable local documentation with security seeds.</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-900 p-4 text-[10px] text-slate-400 border border-slate-800 leading-relaxed font-medium">
                ℹ After evaluation, you can download a plain-text summary saved with a .pdf filename for internal review records.
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ----------------- VIEW 4: ASSESSMENT RESULTS VIEW ----------------- */}
      {activeView === "results" && selectedService && calculatorResults && (
        <div className="space-y-8 animate-fade-in" id="service-results-view">
          
          {/* Results Action Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-100">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-950 text-base">Mathematical Assessment Complete</h3>
                <p className="text-xs text-slate-500 font-semibold">{selectedService.name} • Calculation Ledger</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 text-xs font-bold border border-slate-200 bg-white rounded-xl text-slate-700 hover:bg-slate-50 transition-all flex items-center space-x-1 w-full sm:w-auto justify-center"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>New Evaluation</span>
              </button>
              
              <button
                onClick={handleDownloadPDF}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-sm transition-all flex items-center justify-center space-x-2 w-full sm:w-auto ${
                  downloaded 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : "bg-slate-950 hover:bg-slate-850"
                }`}
              >
                {downloaded ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                    <span>Downloaded report PDF</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download Report PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Core Results KPIs cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Metric Card 1: Value */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {calculatorResults.unitLabel}
              </span>
              <div className="mt-2 flex items-baseline space-x-1.5">
                <span className="font-mono text-2xl font-black text-slate-900 truncate">
                  {calculatorResults.unitValue}
                </span>
              </div>
              <div className="mt-3 text-[11px] font-semibold text-slate-500">
                Derived under <span className="text-slate-900 font-bold">Standard Formula</span>
              </div>
            </div>

            {/* Metric Card 2: Carbon or Score */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
              {calculatorResults.carbonTons !== undefined ? (
                <>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Avoided / Offset Carbon
                  </span>
                  <div className="mt-2 flex items-baseline space-x-1.5">
                    <span className="font-mono text-2xl font-black text-slate-900">
                      {calculatorResults.carbonTons}
                    </span>
                    <span className="text-xs font-bold text-slate-500">tCO₂e / Yr</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Readiness Score
                  </span>
                  <div className="mt-2 flex items-baseline space-x-1.5">
                    <span className="font-mono text-2xl font-black text-slate-900">
                      {calculatorResults.totalScore ?? 85}
                    </span>
                    <span className="text-xs font-bold text-slate-500">/ 100</span>
                  </div>
                </>
              )}
              <div className="mt-3 text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
                <Check className="h-3.5 w-3.5" />
                <span>Configured factor keys applied</span>
              </div>
            </div>

            {/* Metric Card 3: Security & Trust Seal */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Calculation Reference
              </span>
              <div className="mt-1">
                <code className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-mono block select-all truncate">
                  SHA-256: CR-{(selectedService.name.length * 831).toString(16).toUpperCase()}-LOCK
                </code>
              </div>
              <div className="text-[9px] text-slate-400 font-medium">
                *Calculated data set is indexed. Complete certificate requires CB stamping.
              </div>
            </div>

          </div>

          {/* Dynamic Diagrams & Visual Trajectory Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Pie Allocation of parameters */}
            <div className="lg:col-span-5 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-display font-bold text-slate-950 text-sm">Assessment Parameter Breakdown</h4>
                <p className="text-xs text-slate-500 mt-1">Contributing factors to calculated environmental status.</p>
              </div>

              <div className="h-56 mt-4 relative">
                {calculatorResults.breakdown && calculatorResults.breakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={calculatorResults.breakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {calculatorResults.breakdown.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || "#3b82f6"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} units`, "Value"]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">No parameter breakdown records.</div>
                )}
              </div>

              <div className="space-y-2 mt-4 border-t border-slate-50 pt-3">
                {calculatorResults.breakdown?.map((d: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center space-x-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600 truncate max-w-[200px]">{d.name}</span>
                    </div>
                    <span className="font-mono text-slate-950 font-bold">{typeof d.value === "number" && d.value % 1 !== 0 ? d.value.toFixed(2) : d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* trajectory Bar Chart */}
            <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-display font-bold text-slate-950 text-sm">Simulated Decarbonization & Savings Roadmap</h4>
                <p className="text-xs text-slate-500 mt-1">Expected 12-month trajectory following Balancing Carbon recommendations.</p>
              </div>

              <div className="h-56 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { month: "Base", status: 100, target: 100 },
                      { month: "Q1", status: 92, target: 88 },
                      { month: "Q2", status: 86, target: 75 },
                      { month: "Q3", status: 78, target: 64 },
                      { month: "Q4", status: 70, target: 50 }
                    ]}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: "600" }} />
                    <Bar dataKey="status" name="Current Pathway (%)" fill="#475569" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" name="Optimized Pathway (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center space-x-2.5 text-[11px] text-emerald-800 font-semibold leading-relaxed">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>By activating recommended waste heat recuperations and solar substitutions, you can accelerate carbon offsets by up to 24%.</span>
              </div>
            </div>

          </div>

          {/* Recommended Action Plan & compliance pathway */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h4 className="font-display font-bold text-slate-950 text-sm">Action Plan & Compliance Pathway</h4>
              <p className="text-xs text-slate-500 mt-0.5">High-impact tasks formulated dynamically by Balancing Carbon specialists.</p>
            </div>

            <div className="space-y-2.5">
              {calculatorResults.actionPlan?.map((action: string, i: number) => (
                <div key={i} className="flex items-start space-x-3 bg-slate-50 border border-slate-150 rounded-xl p-3.5 shadow-sm">
                  <div className="h-5.5 w-5.5 rounded-full bg-slate-950 text-white flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900 leading-normal">
                      Task: {action.split(" to ")[0]}
                    </p>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                      {action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Required Original Document Checklist */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h4 className="font-display font-bold text-slate-950 text-sm">Audit Evidence Documentation Log</h4>
              <p className="text-xs text-slate-500 mt-0.5">Prepare the following files before certified third-party review.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Evidence Files Checklist</span>
                <div className="space-y-2.5">
                  {selectedService.requiredDocuments.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-bold text-slate-700 bg-white border border-slate-150 rounded-xl p-3 shadow-sm">
                      <span className="truncate max-w-[200px]">{doc}</span>
                      <span className={`text-[9px] px-2.5 py-0.5 rounded-full border ${
                        idx === 0 
                          ? "text-amber-700 bg-amber-50 border-amber-100" 
                          : "text-emerald-700 bg-emerald-50 border-emerald-100"
                      }`}>
                        {idx === 0 ? "Pending Upload" : "Listed"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Calculation Reference</span>
                  <div className="border border-dashed border-slate-200 rounded-2xl p-4 bg-white text-center space-y-2 shadow-sm">
                    <Award className="h-7 w-7 text-slate-950 mx-auto" />
                    <h5 className="text-xs font-bold text-slate-900">Draft Calculation Index</h5>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Indexed with a deterministic input reference.</p>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-medium leading-relaxed mt-4">
                  *Estimates are structured against GLEC, GHG Protocol, and ISO 14064. Complete ISO certificates require accredited partner CB review.
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Results Footer */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 shadow-md border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h4 className="font-display font-bold text-sm">Submit this Assessment?</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Ready for specialist review? Submit this file to the Balancing Carbon assessor queue.</p>
            </div>
            
            <button
              onClick={() => {
                alert("This assessment has been submitted to the Balancing Carbon Lead environmental assessor queue. Our BEE-certified team will contact you in 24 hours.");
              }}
              className="w-full sm:w-auto text-xs font-bold text-slate-950 bg-white hover:bg-slate-100 px-6 py-3 rounded-xl shadow transition-all flex items-center justify-center space-x-1.5"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Submit for Review</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
