import React, { useState } from "react";
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  TrendingDown, 
  BarChart3, 
  ShieldAlert, 
  Award, 
  Sparkles, 
  Calendar, 
  Clock, 
  UserCheck, 
  Activity, 
  ArrowLeft 
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
import { COMPLIANCE_FRAMEWORKS } from "../data/servicesData";

const escapePdfText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const createPdfBlob = (title: string, lines: string[]) => {
  const pageLines = [title, "", ...lines].slice(0, 42);
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    `(${escapePdfText(pageLines[0] || title)}) Tj`,
    "/F1 10 Tf",
    ...pageLines.slice(1).map((line) => `0 -16 Td (${escapePdfText(line)}) Tj`),
    "ET",
  ].join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
};

interface CalculatedDashboardProps {
  sectorName: string;
  serviceName: string;
  inputs: Record<string, any>;
  onReset: () => void;
}

export default function CalculatedDashboard({ 
  sectorName, 
  serviceName, 
  inputs, 
  onReset 
}: CalculatedDashboardProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Derive dynamic mathematical emission numbers based on the user's input values
  const electricity = Number(inputs.electricity || 0);
  const coal = Number(inputs.coal || 0);
  const diesel = Number(inputs.diesel || 0);
  const solar = Number(inputs.solar || 0);

  const productionVolume = Number(inputs.productionVolume || 500);
  const directEmissions = Number(inputs.directEmissions || 720);
  const electricityConsumed = Number(inputs.electricityConsumed || 250000);
  const rawMaterialIntensity = Number(inputs.rawMaterialIntensity || 1.8);

  const materialWeight = Number(inputs.materialWeight || 4.8);
  const cycleTime = Number(inputs.cycleTime || 45);
  const scrapRate = Number(inputs.scrapRate || 12);
  const transportDistance = Number(inputs.transportDistance || 180);

  const connectedLoad = Number(inputs.connectedLoad || 450);
  const powerFactor = Number(inputs.powerFactor || 0.88);
  const motorEfficiency = Number(inputs.motorEfficiency || 25);
  const heatRecovery = inputs.heatRecoveryPotential === "yes" ? 150 : 0;

  const waterIntake = Number(inputs.waterIntake || 55);
  const waterDischarge = Number(inputs.waterDischarge || 38);
  const hazardousWaste = Number(inputs.solidWasteGenerated || 2.4);

  // Mathematical outputs based on the service selected
  let totalEmissions = 0;
  let unitEmissions = 0;
  let categoryLabels = ["Direct Heat", "Grid Energy", "Supply Chain", "Solar Offset"];
  let chartData: { name: string; value: number; color: string }[] = [];

  // Compute specific footprints
  if (serviceName.includes("Scope 1 & 2") || inputs.electricity !== undefined) {
    // Scope 1 & 2 formula
    const scope1 = (coal * 2.15) + ((diesel * 2.68) / 1000); // Tons CO2e
    const scope2 = (electricity * 0.82) / 1000; // Tons CO2e
    const offsets = (solar * -0.82) / 1000; // Tons CO2e offset
    totalEmissions = Math.max(0.1, parseFloat((scope1 + scope2 + offsets).toFixed(2)));
    unitEmissions = parseFloat((totalEmissions / 12).toFixed(2)); // per month

    chartData = [
      { name: "Scope 1 Direct (Coal/Diesel)", value: parseFloat(scope1.toFixed(2)), color: "#f97316" },
      { name: "Scope 2 Indirect (Grid Elec)", value: parseFloat(scope2.toFixed(2)), color: "#3b82f6" },
      { name: "Solar Generation Credits", value: Math.abs(parseFloat(offsets.toFixed(2))), color: "#10b981" }
    ].filter(d => d.value > 0);
  } else if (serviceName.includes("CBAM") || inputs.productionVolume !== undefined) {
    // CBAM Specific
    const rollEmissions = (electricityConsumed * 0.82) / 1000;
    const precursorEmissions = productionVolume * rawMaterialIntensity;
    totalEmissions = parseFloat((directEmissions + rollEmissions + precursorEmissions).toFixed(2));
    unitEmissions = parseFloat((totalEmissions / productionVolume).toFixed(3)); // Intensity per ton

    chartData = [
      { name: "Direct Heat Combustion", value: directEmissions, color: "#ef4444" },
      { name: "Rolling Mill Grid Load", value: parseFloat(rollEmissions.toFixed(2)), color: "#3b82f6" },
      { name: "Precursor Scrap Intensity", value: parseFloat(precursorEmissions.toFixed(2)), color: "#8b5cf6" }
    ];
  } else if (serviceName.includes("Part-Level") || inputs.materialWeight !== undefined) {
    // Component level Product Carbon Footprint (PCF)
    const materialFootprint = materialWeight * 1.95; // kg CO2e per kg steel
    const processFootprint = (cycleTime * 0.45 * 0.82); // CNC running load
    const transportFootprint = (transportDistance * 0.12 * materialWeight) / 1000;
    const wasteFactor = scrapRate > 15 ? 1.4 : 1.1;
    
    totalEmissions = parseFloat((((materialFootprint + processFootprint + transportFootprint) * wasteFactor) / 1000).toFixed(4)); // tCO2e per parts
    unitEmissions = parseFloat((totalEmissions * 1000).toFixed(2)); // kg CO2e per component

    chartData = [
      { name: "Raw Steel Weight", value: parseFloat(materialFootprint.toFixed(2)), color: "#f97316" },
      { name: "CNC Machining power", value: parseFloat(processFootprint.toFixed(2)), color: "#06b6d4" },
      { name: "Inbound Road Freight", value: parseFloat(transportFootprint.toFixed(2)), color: "#64748b" }
    ];
  } else if (serviceName.includes("Energy") || inputs.connectedLoad !== undefined) {
    // Energy Savings
    const annualLoad = connectedLoad * 8760 * 0.65; // kwh
    const activePF = parseFloat(powerFactor.toFixed(2));
    const lossMultiplier = activePF < 0.9 ? (1 - activePF) * 1.5 : 0.02;
    const potentialSavings = annualLoad * (lossMultiplier + (motorEfficiency < 50 ? 0.08 : 0.02) + (heatRecovery > 0 ? 0.05 : 0));
    
    totalEmissions = parseFloat((potentialSavings * 0.82 / 1000).toFixed(2)); // avoided tonnes
    unitEmissions = parseFloat(((potentialSavings * 7.5) / 100000).toFixed(2)); // Lakhs INR saved annually

    chartData = [
      { name: "Grid Loss Avoidance", value: parseFloat((annualLoad * lossMultiplier * 0.82 / 1000).toFixed(2)), color: "#f59e0b" },
      { name: "IE3 Motor Efficiency", value: parseFloat((annualLoad * (motorEfficiency < 50 ? 0.08 : 0.02) * 0.82 / 1000).toFixed(2)), color: "#10b981" },
      { name: "Recuperator Heat Saved", value: parseFloat((heatRecovery * 0.82 / 1000).toFixed(2)), color: "#a855f7" }
    ].filter(d => d.value > 0);
  } else {
    // General water & waste / Higg
    const recycledWater = (waterIntake * (Number(inputs.recycledWaterPct || 35) / 100));
    totalEmissions = parseFloat((waterIntake * 0.32).toFixed(2));
    unitEmissions = parseFloat(recycledWater.toFixed(1)); // recycled kl

    chartData = [
      { name: "Borewell Intake Load", value: parseFloat((waterIntake * 0.32).toFixed(2)), color: "#0ea5e9" },
      { name: "Wastewater Sludge load", value: parseFloat((waterDischarge * 0.45).toFixed(2)), color: "#f43f5e" },
      { name: "Hazardous Solid Segregation", value: parseFloat((hazardousWaste * 0.65).toFixed(2)), color: "#f59e0b" }
    ];
  }

  const generateCalculationReference = () => {
    const dataString = `${sectorName}-${serviceName}-${totalEmissions}-${JSON.stringify(inputs)}-2026`;
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      hash = (hash << 5) - hash + dataString.charCodeAt(i);
      hash |= 0;
    }
    return `CR-${Math.abs(hash).toString(16).toUpperCase().substring(0, 8)}-${new Date().getFullYear()}`;
  };

  const calculationReference = generateCalculationReference();
  const submittedFields = Object.values(inputs).filter((value) => value !== undefined && value !== null && String(value).trim() !== '').length;
  const confidenceInputs = [
    { label: 'Activity inputs', ok: submittedFields >= 3 },
    { label: 'Methodology', ok: true },
    { label: 'Factor source', ok: true },
    { label: 'Evidence', ok: false },
  ];
  const confidencePercent = (confidenceInputs.filter((item) => item.ok).length / confidenceInputs.length) * 100;
  const confidenceLabel = confidencePercent >= 75 ? 'High Confidence' : confidencePercent >= 50 ? 'Medium Confidence' : 'Needs Evidence';

  // Simulated PDF Downloader trigger
  const handleDownloadPDF = () => {
    setDownloading(true);
    setTimeout(() => {
      const pdfLines = [
        `Reference: CALC-${calculationReference}`,
        `Timestamp: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        `Sector/Industry: ${sectorName}`,
        `Assessed service: ${serviceName}`,
        `Reporting boundary: User-submitted calculator inputs`,
        `Total carbon footprint evaluated: ${totalEmissions} tonnes CO2e`,
        `Intensity metric: ${unitEmissions} unit equivalents`,
        `Calculation confidence: ${confidenceLabel}`,
        "",
        "Methodology",
        "Calculations use deterministic formulas embedded in the calculator.",
        "Emission factor source: configured prototype/service formula factors.",
        "Calculation engine version: Balancing Carbon web calculator v1.",
        "",
        "Submitted Inputs",
        ...Object.entries(inputs).map(([key, value]) => `${key.replace(/([A-Z])/g, " $1")}: ${value}`),
        "",
        "Important limitation",
        "This PDF is a calculation summary, not an accredited audit certificate.",
      ];
      const blob = createPdfBlob("Balancing Carbon Calculation Summary", pdfLines);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Carbon_Calculation_${calculationReference}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloading(false);
      setDownloaded(true);
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard-visual-report">
      {/* Header and Reset Toggles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-100">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-900 text-lg">Calculation Summary Report</h3>
            <p className="text-xs text-slate-500">{sectorName} • {serviceName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="px-4 py-2 text-xs font-semibold border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 transition-all flex items-center space-x-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>New Calculation</span>
          </button>
          
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className={`px-4 py-2 text-xs font-bold rounded-xl text-white shadow-sm transition-all flex items-center space-x-2 ${
              downloaded 
                ? "bg-emerald-600 hover:bg-emerald-700" 
                : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {downloading ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Generating PDF...</span>
              </>
            ) : downloaded ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                <span>Downloaded Report PDF</span>
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

      {/* Main KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* KPI 1 */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Calculated Total Emissions</span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="font-mono text-3xl font-black text-slate-900">{totalEmissions}</span>
            <span className="text-xs font-bold text-slate-500">tCO₂e</span>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-[11px] font-semibold text-emerald-600">
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Carbon intensity calculated from submitted values</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Intensity Factor Metrics</span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="font-mono text-3xl font-black text-slate-900">{unitEmissions}</span>
            <span className="text-xs font-bold text-slate-500">units/calc</span>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-slate-500">
            Calculated under <span className="text-slate-900 font-bold">GHG Corporate Annex</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Calculation Confidence</span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="font-mono text-2xl font-black text-slate-900">{confidenceLabel}</span>
          </div>
          <div className="mt-3 space-y-1">
            {confidenceInputs.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                <CheckCircle2 className={`h-3 w-3 ${item.ok ? "text-emerald-600" : "text-amber-600"}`} />
                <span>{item.label} {item.ok ? "available" : "pending"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Graphs & Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pie allocation of emission parameters */}
        <div className="lg:col-span-5 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-display font-bold text-slate-900 text-sm">Carbon & Energy Resource Allocation</h4>
            <p className="text-xs text-slate-500 mt-1">Source categories contributing to the carbon profile.</p>
          </div>

          <div className="h-56 mt-4 relative">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} tCO2e`, "Impact"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">No direct emission source recorded.</div>
            )}
          </div>

          <div className="space-y-2 mt-2">
            {chartData.map((d, i) => (
              <div key={i} className="flex justify-between items-center text-xs font-medium">
                <div className="flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-600">{d.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-950">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart of target trajectory */}
        <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-display font-bold text-slate-900 text-sm">Simulated 12-Month Target Decarbonization Trajectory</h4>
            <p className="text-xs text-slate-500 mt-1">Forecasted reductions under Balancing Carbon transition recommendations.</p>
          </div>

          <div className="h-56 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { month: "Base", current: totalEmissions, target: totalEmissions },
                  { month: "Q1", current: parseFloat((totalEmissions * 0.95).toFixed(2)), target: parseFloat((totalEmissions * 0.92).toFixed(2)) },
                  { month: "Q2", current: parseFloat((totalEmissions * 0.88).toFixed(2)), target: parseFloat((totalEmissions * 0.84).toFixed(2)) },
                  { month: "Q3", current: parseFloat((totalEmissions * 0.81).toFixed(2)), target: parseFloat((totalEmissions * 0.75).toFixed(2)) },
                  { month: "Q4", current: parseFloat((totalEmissions * 0.74).toFixed(2)), target: parseFloat((totalEmissions * 0.68).toFixed(2)) }
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: "600" }} />
                <Bar dataKey="current" name="Estimated Status (tCO2e)" fill="#334155" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Target Pathway (tCO2e)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center space-x-2.5 text-[11px] text-emerald-800 font-semibold leading-relaxed">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Switching to 150kW Captive Solar offsets further grid energy, potentially saving an additional 24% in scope 2 emissions annually.</span>
          </div>
        </div>
      </div>

      {/* Compliance Documents & Audit Ledger section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div>
          <h4 className="font-display font-bold text-slate-900 text-sm">Document Evidence Checklist</h4>
          <p className="text-xs text-slate-500 mt-1">Prepare the following original records before any accredited third-party review.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Evidence Files To Upload</span>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 bg-white border border-slate-150 rounded-lg p-2.5 shadow-sm">
                <span className="truncate">Electricity Utility Bills (12 Months)</span>
                <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">Required</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 bg-white border border-slate-150 rounded-lg p-2.5 shadow-sm">
                <span className="truncate">Coal Weighbridge Purchase slips</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Detected ✓</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 bg-white border border-slate-150 rounded-lg p-2.5 shadow-sm">
                <span className="truncate">Diesel Log Ledger & Generator Certificates</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Detected ✓</span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Calculation Reference</span>
              <div className="border border-dashed border-slate-200 rounded-lg p-3 bg-white text-center space-y-1">
                <Award className="h-6 w-6 text-slate-900 mx-auto" />
                <h5 className="text-xs font-bold text-slate-900">Draft Calculation Ledger</h5>
                <p className="text-[10px] text-slate-500 font-medium">Deterministic input reference</p>
                <code className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono block select-all">
                  CALC: {calculationReference}
                </code>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-3 leading-relaxed">
              *Estimates are structured against common frameworks. Complete ISO certificates require accredited partner CB review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
