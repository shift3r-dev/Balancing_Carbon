export interface IndustrySector {
  id: string;
  name: string;
  iconName: string;
  relevance: "HIGH" | "MEDIUM";
  urgencyDescription: string;
  services: string[]; // service IDs
}

export interface SustainabilityService {
  id: string;
  name: string;
  description: string;
  frameworkId: string;
  scope: "Scope 1" | "Scope 2" | "Scope 1 & 2" | "Scope 3" | "Scope 1, 2, 3" | "Water & Waste" | "Energy Efficiency";
  calculatorConfig: {
    title: string;
    description: string;
    inputs: {
      id: string;
      label: string;
      type: "number" | "select";
      defaultValue: any;
      options?: { label: string; value: any }[];
      unit?: string;
    }[];
  };
}

export interface ComplianceFramework {
  id: string;
  name: string;
  organization: string;
  description: string;
  category: "Carbon" | "Social" | "Supply Chain" | "Energy";
  keyDocuments: string[];
}

export const COMPLIANCE_FRAMEWORKS: ComplianceFramework[] = [
  {
    id: "ghg-protocol",
    name: "GHG Protocol Corporate Standard",
    organization: "WRI & WBCSD",
    description: "The world's most widely used greenhouse gas accounting standards for corporate Scope 1, 2, and 3 emission inventories.",
    category: "Carbon",
    keyDocuments: [
      "12-Month Grid Utility Electricity Invoices",
      "Weighbridge Purchase Logs for Coal or Petcoke",
      "Diesel Fuel Consumption Logs for Backup Generators",
      "Refrigerant gas replenishment receipts"
    ]
  },
  {
    id: "iso-14067",
    name: "ISO 14067: Product Carbon Footprint (PCF)",
    organization: "International Organization for Standardization",
    description: "Specific requirements and guidelines for the quantification and reporting of a product's carbon footprint (PCF) matching LCA principles.",
    category: "Carbon",
    keyDocuments: [
      "Bill of Materials (BOM) with raw ingredient weights",
      "Supplier material mill test certificates (intensity disclosures)",
      "Process specific direct heating energy records",
      "Primary packaging weight and raw material specifications"
    ]
  },
  {
    id: "eu-cbam",
    name: "EU Carbon Border Adjustment Mechanism (CBAM)",
    organization: "European Commission",
    description: "Tax mechanism penalizing imports of carbon-intensive goods (Steel, Aluminum, Cement, Polymers, Fertilizer) entering the EU.",
    category: "Supply Chain",
    keyDocuments: [
      "Accredited raw material greenhouse gas intensity data sheets",
      "Furnace thermal efficiency and combustion heat logs",
      "Quarterly export shipping bills and bill of lading documents",
      "National grid emission factor data (CEA India sheet)"
    ]
  },
  {
    id: "higg-fem",
    name: "Higg Facility Environmental Module (FEM 4.0)",
    organization: "Sustainable Apparel Coalition (Worldly)",
    description: "Global standard evaluating environmental performance of garment spinners, weavers, wet processors, and apparel manufacturers.",
    category: "Supply Chain",
    keyDocuments: [
      "Monthly chemical inventory register (CIL)",
      "Zero Discharge of Hazardous Chemicals (ZDHC) report logs",
      "Wastewater test certificate showing BOD, COD, and pH compliance",
      "Factory waste stream management logs (recycled vs landfill)"
    ]
  },
  {
    id: "sebi-brsr",
    name: "SEBI Business Responsibility & Sustainability Reporting (BRSR)",
    organization: "Securities and Exchange Board of India",
    description: "Mandated ESG framework for the top 1000 listed entities in India, expanding rapidly to cover key value chain MSMEs under 'BRSR Core'.",
    category: "Energy",
    keyDocuments: [
      "Board approved sustainability policy documentation",
      "Annual employee health insurance & safety incident logs",
      "Recycled material intake weight ledger",
      "Equal opportunity wages and gender wage gap declarations"
    ]
  },
  {
    id: "iso-50001",
    name: "ISO 50001: Energy Management Systems (EnMS)",
    organization: "ISO",
    description: "Establishes an energy management system enabling manufacturers to systematically improve thermodynamics, electrical efficiencies, and solar ratios.",
    category: "Energy",
    keyDocuments: [
      "Connected contract electrical load configuration sheets",
      "Transformer and capacitor bank calibration records",
      "Sub-metering logging records for furnaces or compressors",
      "Single-line diagram (SLD) of plant electrical systems"
    ]
  }
];

export const SUSTAINABILITY_SERVICES: SustainabilityService[] = [
  {
    id: "scope-1-2-footprint",
    name: "Corporate Scope 1 & 2 Carbon Footprint",
    description: "Quantify direct fuel combustion and purchased grid electricity carbon emissions for statutory disclosure.",
    frameworkId: "ghg-protocol",
    scope: "Scope 1 & 2",
    calculatorConfig: {
      title: "Scope 1 & 2 Emissions Calculator",
      description: "Input your annual plant utility consumptions to calculate total tonnes of carbon dioxide equivalent (tCO2e).",
      inputs: [
        { id: "electricity", label: "Annual Grid Electricity Consumption", type: "number", defaultValue: 120000, unit: "kWh" },
        { id: "coal", label: "Annual Steam Coal consumed in Furnaces", type: "number", defaultValue: 45, unit: "Tons" },
        { id: "diesel", label: "Annual Diesel consumed in Backup DG Sets", type: "number", defaultValue: 8200, unit: "Litres" },
        { id: "solar", label: "Annual Captive Solar Energy Generated", type: "number", defaultValue: 15000, unit: "kWh" }
      ]
    }
  },
  {
    id: "eu-cbam-declaration",
    name: "EU CBAM Embedded Carbon Declaration",
    description: "Quarterly embedded direct and indirect greenhouse gas intensity reporting for exporting metals and polymers.",
    frameworkId: "eu-cbam",
    scope: "Scope 1, 2, 3",
    calculatorConfig: {
      title: "CBAM Product Intensity Calculator",
      description: "Calculate direct calcination and indirect processing emissions per metric ton of steel/cement manufactured.",
      inputs: [
        { id: "productionVolume", label: "Total Quarterly Export Production Volume", type: "number", defaultValue: 500, unit: "Metric Tons (MT)" },
        { id: "directEmissions", label: "Direct Furnace Calcination & Heating Emissions", type: "number", defaultValue: 720, unit: "tCO2e" },
        { id: "electricityConsumed", label: "Electricity Consumed in Rolling Mills", type: "number", defaultValue: 250000, unit: "kWh" },
        { id: "rawMaterialIntensity", label: "Precursor Steel/Scrap Carbon Intensity", type: "number", defaultValue: 1.8, unit: "tCO2e/ton" }
      ]
    }
  },
  {
    id: "higg-fem-readiness",
    name: "Higg FEM 4.0 Assessment Preparation",
    description: "Comprehensive audits covering chemical safety registers, wastewater standards, and solid waste processing compliance.",
    frameworkId: "higg-fem",
    scope: "Water & Waste",
    calculatorConfig: {
      title: "Higg FEM 4.0 Score Estimator",
      description: "Answer basic environmental checklist metrics to estimate your plant's Higg certification level.",
      inputs: [
        { id: "chemicalTracking", label: "Do you maintain a complete Chemical Inventory List (CIL)?", type: "select", defaultValue: "yes", options: [{ label: "Yes (Complete ZDHC Compliance)", value: "yes" }, { label: "No (Chemicals untracked)", value: "no" }] },
        { id: "wastewaterStandard", label: "Wastewater is tested and complies with local GPCB/MPCB norms?", type: "select", defaultValue: "compliant", options: [{ label: "Yes, fully compliant", value: "compliant" }, { label: "Partially / No treatment system", value: "non-compliant" }] },
        { id: "recycledWaterPct", label: "Water recycled/reused inside the plant (%)", type: "number", defaultValue: 35, unit: "%" },
        { id: "wasteSegregation", label: "Is hazardous slag/fly-ash segregated and sold to certified processors?", type: "select", defaultValue: "yes", options: [{ label: "Yes, 100% segregated", value: "yes" }, { label: "No / Mixed disposal", value: "no" }] }
      ]
    }
  },
  {
    id: "part-pcf-engineering",
    name: "Part-Level Product Carbon Footprint (PCF)",
    description: "Cradle-to-gate lifecycle assessment (LCA) for component-level carbon reporting to automotive and electronics OEMs.",
    frameworkId: "iso-14067",
    scope: "Scope 1 & 2",
    calculatorConfig: {
      title: "Component Product Carbon Footprint Sandbox",
      description: "Model raw steel processing, energy stamping, and logistics to output a verified tCO2e intensity per physical component.",
      inputs: [
        { id: "materialWeight", label: "Net Raw Steel/Material Weight per Component", type: "number", defaultValue: 4.8, unit: "kg" },
        { id: "cycleTime", label: "Press/CNC machine electrical cycle time", type: "number", defaultValue: 45, unit: "Seconds" },
        { id: "scrapRate", label: "Material stamping scrap/loss percentage", type: "number", defaultValue: 12, unit: "%" },
        { id: "transportDistance", label: "Average transport distance from raw supplier to factory", type: "number", defaultValue: 180, unit: "km" }
      ]
    }
  },
  {
    id: "iso-50001-energy-audit",
    name: "ISO 50001 Industrial Energy Audit",
    description: "Systematic energy evaluation identifying heat-recovery, power factor improvements, and solar potential.",
    frameworkId: "iso-50001",
    scope: "Energy Efficiency",
    calculatorConfig: {
      title: "Plant Energy Saving & Efficiency Estimator",
      description: "Calculate thermodynamic and power-saving potential of industrial motor grids and thermal furnaces.",
      inputs: [
        { id: "connectedLoad", label: "Total Connected Electrical Load", type: "number", defaultValue: 450, unit: "kVA" },
        { id: "powerFactor", label: "Average plant Power Factor (PF)", type: "number", defaultValue: 0.88, unit: "cos φ" },
        { id: "heatRecoveryPotential", label: "Does furnace exhaust gas have heat recovery recuperators?", type: "select", defaultValue: "no", options: [{ label: "No Heat Recuperators Installed", value: "no" }, { label: "Yes, recuperators active", value: "yes" }] },
        { id: "motorEfficiency", label: "Percentage of IE3/IE4 High Efficiency Motors", type: "number", defaultValue: 25, unit: "%" }
      ]
    }
  },
  {
    id: "water-waste-audit",
    name: "Water and Waste Minimization Audit",
    description: "Comprehensive audits assessing zero-liquid-discharge (ZLD) systems, hazardous sludge, and water balances.",
    frameworkId: "higg-fem",
    scope: "Water & Waste",
    calculatorConfig: {
      title: "Water Balance & Waste Footprint",
      description: "Model water intakes, evaporation losses, and sewage recycling to minimize fresh borewell extraction charges.",
      inputs: [
        { id: "waterIntake", label: "Daily Fresh Water Intake (Borewell/Tankers)", type: "number", defaultValue: 55, unit: "kL (KiloLitres)" },
        { id: "waterDischarge", label: "Daily Wastewater Discharge Volume", type: "number", defaultValue: 38, unit: "kL" },
        { id: "hasZld", label: "Do you operate an active Zero Liquid Discharge (ZLD) treatment plant?", type: "select", defaultValue: "no", options: [{ label: "No ZLD active", value: "no" }, { label: "Yes, ZLD active", value: "yes" }] },
        { id: "solidWasteGenerated", label: "Solid/Hazardous process waste generated", type: "number", defaultValue: 2.4, unit: "Tons/Month" }
      ]
    }
  },
  {
    id: "green-bank-esg",
    name: "Green Bank ESG Tender Rating",
    description: "Evaluates workplace safety, ESG governance, and decarbonization roadmap to unlock low-interest banking lines.",
    frameworkId: "sebi-brsr",
    scope: "Scope 1, 2, 3",
    calculatorConfig: {
      title: "ESG Bank Loan Eligibility Score",
      description: "Model key SEBI BRSR and governance metrics to qualify for concessional green interest rates.",
      inputs: [
        { id: "boardGenderDiversity", label: "Do you have formal board/governance guidelines written?", type: "select", defaultValue: "yes", options: [{ label: "Yes, with formal ESG policies", value: "yes" }, { label: "No official policies", value: "no" }] },
        { id: "accidentRate", label: "Annual workplace recordable safety incidents", type: "number", defaultValue: 0, unit: "Incidents" },
        { id: "wageEquality", label: "Do you offer equal pension and healthcare benefits to all contract labors?", type: "select", defaultValue: "yes", options: [{ label: "Yes, 100% equal benefit program", value: "yes" }, { label: "No / Partial coverage", value: "no" }] },
        { id: "emissionsTarget", label: "Do you have a written target year to reduce CO2 emissions (e.g. Net Zero 2045)?", type: "select", defaultValue: "yes", options: [{ label: "Yes, written and board-signed", value: "yes" }, { label: "No target set yet", value: "no" }] }
      ]
    }
  }
];

export const INDUSTRY_SECTORS: IndustrySector[] = [
  {
    id: "iron-steel",
    name: "Iron & Steel (Foundries & Forging)",
    iconName: "Flame",
    relevance: "HIGH",
    urgencyDescription: "Highly exposed to massive EU CBAM tariffs and domestic steel scrap circularity laws.",
    services: ["scope-1-2-footprint", "eu-cbam-declaration", "iso-50001-energy-audit"]
  },
  {
    id: "textiles-garments",
    name: "Textile Spinning & Apparel Weaving",
    iconName: "Layers",
    relevance: "HIGH",
    urgencyDescription: "Mandated to undergo rigorous annual Higg FEM 4.0 audits and ZDHC hazardous chemical screenings by global fast-fashion brands.",
    services: ["higg-fem-readiness", "water-waste-audit", "scope-1-2-footprint"]
  },
  {
    id: "auto-components",
    name: "Automobile Components (OEM Tiers)",
    iconName: "Cpu",
    relevance: "HIGH",
    urgencyDescription: "OEM buyers like Maruti, Tata Motors, and Apple supplier networks mandate component-level ISO 14067 Product Carbon Footprints.",
    services: ["part-pcf-engineering", "green-bank-esg", "iso-50001-energy-audit"]
  },
  {
    id: "chemicals-pigments",
    name: "Chemical Synthesis & Pigment Factories",
    iconName: "Droplet",
    relevance: "MEDIUM",
    urgencyDescription: "Strict chemical reaction safety audits combined with high-volume thermal furnace efficiency monitoring.",
    services: ["scope-1-2-footprint", "water-waste-audit", "iso-50001-energy-audit"]
  },
  {
    id: "pharma-apis",
    name: "Pharmaceutical APIs & Formulations",
    iconName: "Award",
    relevance: "MEDIUM",
    urgencyDescription: "High-level regulatory oversight on solvents, zero liquid discharge compliance, and clinical carbon impact scores.",
    services: ["scope-1-2-footprint", "water-waste-audit", "green-bank-esg"]
  },
  {
    id: "cement-manufacturers",
    name: "Cement & Clinker Manufacturers",
    iconName: "Building2",
    relevance: "HIGH",
    urgencyDescription: "Intense direct combustion and calcination profile, facing severe EU CBAM carbon border taxation on exports.",
    services: ["scope-1-2-footprint", "eu-cbam-declaration", "water-waste-audit"]
  },
  {
    id: "polymer-plastics",
    name: "Polymer Extrusion & Plastics",
    iconName: "ShieldCheck",
    relevance: "MEDIUM",
    urgencyDescription: "Facing strict packaging recycling target laws (EPR) and product cradle-to-gate carbon disclosures.",
    services: ["part-pcf-engineering", "water-waste-audit", "iso-50001-energy-audit"]
  }
];

// Calculation Formula definitions with descriptions and India emission factors
export const EMISSION_FACTORS = [
  { source: "Grid Electricity (India)", factor: 0.82, unit: "kg CO2e per kWh", sourceRef: "CEA (Central Electricity Authority) CO2 Baseline Database v19" },
  { source: "Steam Coal (India standard)", factor: 2.15, unit: "kg CO2e per kg", sourceRef: "IPCC Guidelines for National Greenhouse Gas Inventories" },
  { source: "Diesel Fuel (India standard)", factor: 2.68, unit: "kg CO2e per Litre", sourceRef: "Ministry of Petroleum and Natural Gas (MoPNG) disclosures" },
  { source: "Water Supply Intake (recycled offset)", factor: 0.32, unit: "kg CO2e per kL", sourceRef: "Higg Index GRP methodologies" },
  { source: "Carbon Solar Offset Credit", factor: -0.82, unit: "kg CO2e per kWh saved", sourceRef: "CDM Standard offset parameters" }
];
