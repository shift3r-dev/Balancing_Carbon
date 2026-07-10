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
  BookOpen 
} from "lucide-react";

export interface ServiceDetail {
  id: string;
  name: string;
  iconName: string;
  oneLiner: string;
  overview: string;
  businessProblems: string[];
  industriesServed: string[];
  benefits: string[];
  process: { step: number; name: string; desc: string }[];
  deliverables?: string[];
  requiredDocuments: string[];
  frameworks: string[];
  timeline: string;
  faqs: { q: string; a: string }[];
  assessmentConfig: {
    title: string;
    description: string;
    inputs: {
      id: string;
      label: string;
      type: "number" | "select";
      defaultValue: any;
      unit?: string;
      options?: { label: string; value: any }[];
    }[];
    formula: (inputs: Record<string, any>) => {
      totalScore?: number;
      carbonTons?: number;
      unitLabel?: string;
      unitValue?: number | string;
      summaryText: string;
      breakdown: { name: string; value: number; color: string }[];
      actionPlan: string[];
    };
  };
}

export const SERVICES_REDESIGN_DATA: ServiceDetail[] = [
  {
    id: "ghg-accounting",
    name: "GHG Accounting",
    iconName: "Globe",
    oneLiner: "Measure, manage, and report corporate Scope 1, 2, and 3 carbon emissions.",
    overview: "Establish a structured corporate carbon footprint inventory. We streamline the aggregation of fuel, grid electricity, transport dockets, and upstream vendor materials into a traceable compliance register.",
    businessProblems: [
      "Inability to respond to supply chain carbon emission questionnaires from global buyers.",
      "Lack of granular insight into which plants, processes, or furnaces drive high energy tariffs.",
      "Manual compilation of messy utilities and fuel logs in spreadsheets, risking human calculation errors."
    ],
    industriesServed: ["Heavy Foundries & Forging", "Textile Spinning & Dyeing", "Chemical Factories", "Tier-1 Auto Components", "API Pharma Labs"],
    benefits: [
      "Fulfill corporate carbon disclosure requirements for global contracts instantly.",
      "Identify Scope 2 grid load inefficiencies to immediately optimize furnace electricity bills.",
      "Bypass tedious carbon calculations using our automated invoice ingestion algorithms."
    ],
    process: [
      { step: 1, name: "Utility Ledger Upload", desc: "Securely upload 12 months of electricity bills, diesel fuel slips, and coal invoices." },
      { step: 2, name: "Emission Factor Mapping", desc: "Our engine maps physical readings to official CEA India and IPCC thermodynamic emissions coefficients." },
      { step: 3, name: "Pre-Audit Gap Review", desc: "Our in-house carbon verifiers review data quality to flag missing records or outlier entries." },
      { step: 4, name: "Ledger Summary", desc: "Unlock visual ESG reports, download the calculated carbon ledger, and keep a deterministic input reference." }
    ],
    deliverables: [
      "Corporate Carbon Inventory & Ledger (Scope 1, 2, 3)",
      "Greenhouse Gas Disclosure Draft Report",
      "Dynamic Plant-by-Plant Emissions Analytics",
      "Tailored Decarbonization Hotspot Recommendations Register"
    ],
    requiredDocuments: [
      "12-Month grid electricity utility bills",
      "Furnace coal or coke weight logs",
      "Backup DG set diesel procurement logs",
      "Plant refrigerant gas recharge logs"
    ],
    frameworks: ["GHG Protocol Corporate Standard", "ISO 14064-1:2018 Specification", "SBTi Corporate Net-Zero Framework"],
    timeline: "2-3 Weeks",
    faqs: [
      { q: "Is Balancing Carbon an official accreditation body?", a: "No, Balancing Carbon provides SaaS and advisory support to aggregate and calculate your logs. Accredited audit firms or certification bodies remain responsible for official assurance or certificate stamping." },
      { q: "What is Scope 3 GHG Accounting?", a: "Scope 3 includes upstream and downstream emissions from your supply chain, logistics partners, and raw materials. It is increasingly mandated by international automobile OEMs and electronics buyers." }
    ],
    assessmentConfig: {
      title: "Corporate GHG Baseline Assessment",
      description: "Enter your factory's annual utilities consumption to see an estimated Scope 1 & 2 carbon baseline output.",
      inputs: [
        { id: "electricity", label: "Annual Grid Electricity Purchased", type: "number", defaultValue: 125000, unit: "kWh" },
        { id: "coal", label: "Annual Steam Coal Burned in Furnaces", type: "number", defaultValue: 60, unit: "Tons" },
        { id: "diesel", label: "Annual Diesel Used in Generators/Vehicles", type: "number", defaultValue: 8000, unit: "Litres" },
        { id: "solar", label: "Annual Captive Solar Power Generated", type: "number", defaultValue: 15000, unit: "kWh" }
      ],
      formula: (inputs) => {
        const elec = Number(inputs.electricity || 0);
        const coal = Number(inputs.coal || 0);
        const diesel = Number(inputs.diesel || 0);
        const solar = Number(inputs.solar || 0);

        const scope2 = elec * 0.82; // 0.82 kg CO2e per kWh
        const scope1Coal = coal * 1000 * 2.15; // 2.15 kg CO2e per kg
        const scope1Diesel = diesel * 2.68; // 2.68 kg CO2e per L
        const offsets = solar * -0.82;

        const totalKg = scope2 + scope1Coal + scope1Diesel + offsets;
        const tons = Math.max(0.1, parseFloat((totalKg / 1000).toFixed(2)));

        const scope1Pct = Math.round(((scope1Coal + scope1Diesel) / Math.max(1, totalKg - offsets)) * 100);
        const scope2Pct = Math.round((scope2 / Math.max(1, totalKg - offsets)) * 100);

        return {
          carbonTons: tons,
          unitLabel: "Annual tCO₂e Baseline",
          unitValue: tons,
          summaryText: `Your estimated corporate footprint is ${tons.toLocaleString()} tCO₂e. Directly combusting coal/diesel constitutes ${scope1Pct}% of your emissions, while purchasing grid electricity represents ${scope2Pct}% of your carbon exposure.`,
          breakdown: [
            { name: "Direct Heat (Scope 1)", value: parseFloat(((scope1Coal + scope1Diesel) / 1000).toFixed(2)), color: "#f97316" },
            { name: "Grid Electricity (Scope 2)", value: parseFloat((scope2 / 1000).toFixed(2)), color: "#3b82f6" },
            { name: "Solar Clean Energy Offset", value: Math.abs(parseFloat((offsets / 1000).toFixed(2))), color: "#10b981" }
          ].filter(b => b.value > 0),
          actionPlan: [
            "Increase your rooftop solar ratio to offset scope 2 carbon intensity.",
            "Upgrade your coal furnace combustion draft controls to improve thermodynamic efficiency.",
            "Begin tracking supplier emissions to prepare for Scope 3 disclosure requirements."
          ]
        };
      }
    }
  },
  {
    id: "product-carbon-footprint",
    name: "Product Carbon Footprint (PCF)",
    iconName: "Layers",
    oneLiner: "Calculate the cradle-to-gate carbon intensity per individual product or part.",
    overview: "Formulate part-level emissions inventories requested by international OEMs. We map raw material weight, stamping/extrusion cycle times, and freight transport routes to deliver calculated carbon intensity metrics per physical SKU.",
    businessProblems: [
      "OEM clients (like Maruti, Tata Motors, or Apple supply chain) threatening vendor penalties unless part-level PCFs are disclosed.",
      "Unable to determine the carbon premium of using recycled scrap versus virgin steel or polymers.",
      "Exclusion from bidding on green corporate tenders due to a lack of product-level carbon certifications."
    ],
    industriesServed: ["Die Castings & Machined Parts", "Plastic Molding & Polymers", "Electronics Assemblers", "Industrial Packaging", "Aluminum Extrusions"],
    benefits: [
      "Support export conversations with structured low-carbon product disclosures.",
      "Identify thermodynamic hotspots in raw smelting or stamping lines to lower component cost.",
      "Differentiate your manufacturing business with documented product carbon profiles."
    ],
    process: [
      { step: 1, name: "BOM Extraction", desc: "Provide the physical Bill of Materials (BOM) including weights of raw material inputs." },
      { step: 2, name: "Cycle-Time Log Audit", desc: "Log active machine stamping, extrusion, or CNC electricity usage during cycle times." },
      { step: 3, name: "Inbound Freight Map", desc: "Map supply chain shipping miles and vehicle types from raw component miners." },
      { step: 4, name: "PCF Datasheet Release", desc: "Obtain a calculated part-level PCF datasheet detailing kg CO2e per SKU." }
    ],
    deliverables: [
      "Product Carbon Footprint (PCF) Compliance Datasheet",
      "BOM Raw Material Lifecycle Intensity Report",
      "Component Carbon Hotspot Breakdown Visualizations",
      "Low-Carbon Product Claim Evidence Pack"
    ],
    requiredDocuments: [
      "Product Bill of Materials (BOM) sheets",
      "Supplier raw metal mill test certificates (MTC)",
      "Machine electrical cycle logs (kWh per stamp)",
      "Inbound logistics dockets and transporter contracts"
    ],
    frameworks: ["ISO 14067:2018 Greenhouse Gases", "GHG Protocol Product Standard", "WBCSD PACT Methodology"],
    timeline: "2-3 Weeks",
    faqs: [
      { q: "What is 'Cradle-to-Gate'?", a: "Cradle-to-gate measures the emissions generated from extracting raw materials up to the point where the finished product leaves your factory gate, excluding subsequent distribution and disposal." },
      { q: "Is a PCF report valid for multiple product models?", a: "A PCF is SKU-specific. However, our platform groups similar part geometries to drastically speed up calculations and lower compliance costs for high-SKU catalogs." }
    ],
    assessmentConfig: {
      title: "Part-Level Product Carbon Footprint Solver",
      description: "Estimate the cradle-to-gate carbon intensity of a single manufactured product or part.",
      inputs: [
        { id: "materialWeight", label: "Net Raw Material Weight per Part (Steel/Alum/Plastics)", type: "number", defaultValue: 5, unit: "kg" },
        { id: "materialType", label: "Raw Precursor Material Intensity Type", type: "select", defaultValue: "virgin-steel", options: [
          { label: "Virgin Carbon Steel (2.0 kg CO2e/kg)", value: "virgin-steel" },
          { label: "Recycled Steel Scrap (0.6 kg CO2e/kg)", value: "recycled-steel" },
          { label: "Virgin Aluminum Ingot (8.5 kg CO2e/kg)", value: "virgin-aluminum" },
          { label: "Virgin Polymer resin (1.8 kg CO2e/kg)", value: "virgin-polymer" }
        ]},
        { id: "machineCycle", label: "CNC/Stamping Machine Cycle Time per Part", type: "number", defaultValue: 40, unit: "Seconds" },
        { id: "logisticsDist", label: "Logistics Freight Distance from Supplier to Factory", type: "number", defaultValue: 250, unit: "km" }
      ],
      formula: (inputs) => {
        const weight = Number(inputs.materialWeight || 0);
        const cycle = Number(inputs.machineCycle || 0);
        const dist = Number(inputs.logisticsDist || 0);
        const matType = String(inputs.materialType || "virgin-steel");

        let matFactor = 2.0;
        if (matType === "recycled-steel") matFactor = 0.6;
        if (matType === "virgin-aluminum") matFactor = 8.5;
        if (matType === "virgin-polymer") matFactor = 1.8;

        const materialCO2 = weight * matFactor;
        // Press cycle electrical load (assume 15kW draw average)
        const cycleKwh = (cycle / 3600) * 15;
        const processingCO2 = cycleKwh * 0.82; // CEA India grid factor
        // Freight load factor (assume 0.12 kg CO2e per kg-km)
        const freightCO2 = (weight / 1000) * dist * 0.12;

        const totalCO2PerPart = parseFloat((materialCO2 + processingCO2 + freightCO2).toFixed(3));

        return {
          carbonTons: totalCO2PerPart,
          unitLabel: "kg CO₂e per Single Component",
          unitValue: `${totalCO2PerPart} kg`,
          summaryText: `Your estimated carbon footprint for this specific SKU is ${totalCO2PerPart} kg CO₂e. The raw precursor material is the dominant contributor, representing ${Math.round((materialCO2 / (materialCO2 + processingCO2 + freightCO2)) * 100)}% of the cradle-to-gate product footprint.`,
          breakdown: [
            { name: "Precursor Raw Material", value: parseFloat(materialCO2.toFixed(2)), color: "#f97316" },
            { name: "Shopfloor Electricity", value: parseFloat(processingCO2.toFixed(2)), color: "#3b82f6" },
            { name: "Inbound Road Logistics", value: parseFloat(freightCO2.toFixed(2)), color: "#64748b" }
          ].filter(b => b.value > 0),
          actionPlan: [
            "Source high-recycled content raw alloys to reduce materials footprint by up to 70%.",
            "Optimize cycle time or switch stamping motors to high-efficiency IE4 motor configurations.",
            "Consolidate shipping volumes or recruit regional distributors to trim road freight logistics miles."
          ]
        };
      }
    }
  },
  {
    id: "life-cycle-assessment",
    name: "Life Cycle Assessment (LCA)",
    iconName: "Scale",
    oneLiner: "Analyze end-to-end environmental impacts across all product lifecycle stages.",
    overview: "Conduct rigorous, cradle-to-grave or cradle-to-gate environmental assessments conforming to ISO guidelines. We analyze acidification, water scarcity, resource depletion, and climate change indices to deliver deep scientific compliance sheets.",
    businessProblems: [
      "Customers asking for global environmental product declarations (EPD) to bypass export custom blocks.",
      "Inability to scientifically prove 'eco-friendly' or 'circular' claims to corporate sustainability committees.",
      "Difficulty locating resource waste hot spots across product distribution, packaging, or disposal stages."
    ],
    industriesServed: ["Heavy Castings & Alloys", "Apparel & Textile Spinners", "Bio-Pharma Products", "Packaging & Boxes", "Pre-Cast Cement Units"],
    benefits: [
      "Publish registered Environmental Product Declarations (EPD) to access premium EU construction markets.",
      "Discover hidden design changes that reduce chemical usage and raw material mass.",
      "Secure robust scientific claims that protect your business from regulatory greenwashing investigations."
    ],
    process: [
      { step: 1, name: "Goal & Scope Formulation", desc: "Identify the product's functional units, boundaries, and assessment goals." },
      { step: 2, name: "Inventory Collection (LCI)", desc: "Compile complete mass balance records, water inputs, waste outputs, and energy loads." },
      { step: 3, name: "Impact Modeling (LCIA)", desc: "Model inventory data using global scientific databases (EcoInvent) to compute multi-impact factors." },
      { step: 4, name: "LCA Report & EPD Draft", desc: "Export a comprehensive LCA report ready for accredited verification and EPD portal submission." }
    ],
    deliverables: [
      "ISO 14044-Compliant Life Cycle Assessment Report",
      "Environmental Product Declaration (EPD) Data Package",
      "Circular Material Scarcity and Recyclability Index",
      "Acidification & Eutrophication Water Impact Scorecard"
    ],
    requiredDocuments: [
      "Detailed process flow diagrams (PFD)",
      "Bill of Materials (BOM) & packaging weights",
      "Water balance records & wastewater test data",
      "Waste disposal receipts (hazardous vs municipal)"
    ],
    frameworks: ["ISO 14040:2006 (LCA Principles)", "ISO 14044:2006 (LCA Requirements)", "EN 15804 Construction Standards"],
    timeline: "4-6 Weeks",
    faqs: [
      { q: "What is an EPD?", a: "An Environmental Product Declaration (EPD) is an independently verified document that transparently registers a product's life-cycle environmental impact. It is highly valued in European construction and automotive markets." },
      { q: "Is LCA and Carbon Footprint the same?", a: "A Product Carbon Footprint (PCF) focuses only on greenhouse gases. An LCA measures multiple impact categories, such as freshwater consumption, toxicity, metal depletion, and ozone layer damage." }
    ],
    assessmentConfig: {
      title: "Life Cycle Impact Sandbox Solver",
      description: "Input raw material tonnage and process fuel factors to evaluate an industrial LCA estimate.",
      inputs: [
        { id: "productionTons", label: "Annual Finished Product Output", type: "number", defaultValue: 200, unit: "Tons" },
        { id: "virginMetals", label: "Virgin Metals/Raw Ingot Intake", type: "number", defaultValue: 180, unit: "Tons" },
        { id: "naturalGas", label: "Process Thermal Heat (Natural Gas)", type: "number", defaultValue: 450, unit: "Gigajoules (GJ)" },
        { id: "hazardousSludge", label: "Solid Chemical Waste Generated", type: "number", defaultValue: 5, unit: "Tons" }
      ],
      formula: (inputs) => {
        const prod = Number(inputs.productionTons || 1);
        const virgin = Number(inputs.virginMetals || 0);
        const heat = Number(inputs.naturalGas || 0);
        const sludge = Number(inputs.hazardousSludge || 0);

        // 1.8 tCO2e per ton virgin metal
        const rawCO2 = virgin * 1.8;
        // 0.056 tCO2e per GJ natural gas
        const heatCO2 = heat * 0.056;
        // 0.45 tCO2e per ton hazardous sludge process
        const wasteCO2 = sludge * 0.45;

        const totalCO2 = parseFloat((rawCO2 + heatCO2 + wasteCO2).toFixed(2));
        const intensity = parseFloat((totalCO2 / prod).toFixed(3));

        return {
          carbonTons: totalCO2,
          unitLabel: "Lifecycle Intensity (tCO₂e / Finished Ton)",
          unitValue: `${intensity} tCO2e/ton`,
          summaryText: `Your industrial process carbon intensity is evaluated at ${intensity} tCO₂e per finished product metric ton. Raw precursor material extraction constitutes ${Math.round((rawCO2 / Math.max(1, totalCO2)) * 100)}% of the total, followed by thermal processing.`,
          breakdown: [
            { name: "Precursor Resource Extraction", value: parseFloat(rawCO2.toFixed(2)), color: "#f97316" },
            { name: "Thermal Furnace Processing", value: parseFloat(heatCO2.toFixed(2)), color: "#a855f7" },
            { name: "Hazardous Sludge Disposal", value: parseFloat(wasteCO2.toFixed(2)), color: "#f43f5e" }
          ].filter(b => b.value > 0),
          actionPlan: [
            "Integrate at least 25% secondary recycled scrap to slash material extraction impact.",
            "Install a heat recovery recuperator on high-heat furnace exhaust vents to save natural gas.",
            "Introduce solvent recovery closed-loops to scale down hazardous process sludge volumes."
          ]
        };
      }
    }
  },
  {
    id: "net-zero-strategy",
    name: "Net Zero Strategy",
    iconName: "TrendingDown",
    oneLiner: "Develop realistic, board-signed decarbonization and energy transition roadmaps.",
    overview: "Formulate practical, cost-effective carbon reduction strategies that protect your bottom line. We outline realistic timelines to transition to rooftop solar, upgrade motors, purchase green energy open-access, and offset residual footprints with certified credits.",
    businessProblems: [
      "Board of directors or listed parent company mandating a Net Zero target without a clear budget or pathway.",
      "Inability to justify capital expenditure on solar panels or energy recovery systems with simple ROI sheets.",
      "Exclusion from premier corporate purchasing lists due to a lack of formal decarbonization commitments."
    ],
    industriesServed: ["Heavy Foundries & Alloys", "Automobile Tier-1 Components", "Paper & Pulp Mills", "Textile Processors", "Pre-Cast Concrete Units"],
    benefits: [
      "Secure a highly professional, board-signed Net Zero roadmap to present to lenders.",
      "Identify high-ROI energy savings that payback solar CAPEX in under 36 months.",
      "Future-proof operations from domestic carbon taxes and clean energy mandates."
    ],
    process: [
      { step: 1, name: "Footprint Baseline", desc: "Securely map and establish your calculated Scope 1 & 2 baseline ledger." },
      { step: 2, name: "CAPEX Cost Curve Modeling", desc: "Map potential reduction projects (solar, motor upgrades, waste heat) against execution cost." },
      { step: 3, name: "Target Phase Allocation", desc: "Design practical milestones for 2030 (Scope 2 carbon free), 2035, and Net Zero target years." },
      { step: 4, name: "Board Pack & SLA Signing", desc: "Acquire your board-ready Decarbonization Roadmap document and set-up tracking key metrics." }
    ],
    deliverables: [
      "Official Corporate Net Zero Roadmap & Transition Pack",
      "Marginal Abatement Cost Curve (MACC) ROI Spreadsheet",
      "Year-by-Year Science-Based Reduction Pathway Model",
      "Renewable Energy (Solar/Open Access) Feasibility Plan"
    ],
    requiredDocuments: [
      "Facility layout drawings (for roof-top solar area evaluation)",
      "Electrical single-line diagrams (SLD)",
      "Capital investment budget guidelines",
      "Power purchase agreements (PPA) with grid utilities"
    ],
    frameworks: ["SBTi Net-Zero Standard", "ISO 14068-1:2023 (Carbon Neutrality)", "RE100 Renewable Campaign Guidelines"],
    timeline: "3-4 Weeks",
    faqs: [
      { q: "Does Net Zero require buying expensive offsets immediately?", a: "Absolutely not. Our approach prioritizes direct 'in-house' cost-saving measures first—like solar and thermodynamic heat recovery. Carbon offsets are strictly reserved as a final step for residual, unavoidable emissions." },
      { q: "Is SBTi target setting mandatory for MSMEs?", a: "While not legally mandatory yet, major global buyers (e.g. IKEA, Walmart, Maruti, Apple) are making SBTi-aligned target commitments a prerequisite for vendor contracts." }
    ],
    assessmentConfig: {
      title: "Transition Cost Curve & Decarbonization Estimator",
      description: "Estimate your potential carbon reduction pathway and payback period based on renewable energy investment.",
      inputs: [
        { id: "currentEmissions", label: "Your Annual Carbon Footprint", type: "number", defaultValue: 250, unit: "tCO2e" },
        { id: "targetYear", label: "Select Desired Net Zero Target Year", type: "select", defaultValue: "2040", options: [
          { label: "Aggressive (Net Zero by 2030)", value: "2030" },
          { label: "Standard (Net Zero by 2040)", value: "2040" },
          { label: "Gradual (Net Zero by 2050)", value: "2050" }
        ]},
        { id: "solarBudget", label: "CAPEX Budget Available for Rooftop Solar", type: "number", defaultValue: 15, unit: "Lakhs INR" },
        { id: "facilityOwnership", label: "Plant Facility Ownership Status", type: "select", defaultValue: "owned", options: [
          { label: "Owned Facility (Ideal for Solar CAPEX)", value: "owned" },
          { label: "Leased Facility (Suited for Green PPAs)", value: "leased" }
        ]}
      ],
      formula: (inputs) => {
        const footprint = Number(inputs.currentEmissions || 10);
        const budget = Number(inputs.solarBudget || 0);
        const owner = String(inputs.facilityOwnership || "owned");

        // Assume 1 Lakh CAPEX gives ~3kW solar, yielding ~4.5 MWh/yr, saving ~3.7 tCO2e/yr
        const solarCapacityKw = (budget * 3);
        const annualSolarOffset = Math.min(footprint * 0.7, (solarCapacityKw * 1.5 * 0.82)); // cap at 70% reduction

        const residualEmissions = parseFloat((footprint - annualSolarOffset).toFixed(1));
        const paybackYrs = budget > 0 ? parseFloat((budget / Math.max(1, (annualSolarOffset * 7500 / 100000))).toFixed(1)) : 0; // 7500 savings per ton of carbon saved in power bills

        return {
          carbonTons: residualEmissions,
          unitLabel: "Residual Footprint After Solar Investment",
          unitValue: `${residualEmissions} tCO2e`,
          summaryText: `By investing ${budget} Lakhs INR in a ${solarCapacityKw}kW captive rooftop solar plant, you can slash your carbon footprint by ${Math.round((annualSolarOffset / footprint) * 100)}% (${annualSolarOffset.toFixed(1)} tCO₂e saved annually) with an estimated payback of ${paybackYrs} years on your power utility savings.`,
          breakdown: [
            { name: "Avoided Grid Emissions", value: parseFloat(annualSolarOffset.toFixed(2)), color: "#10b981" },
            { name: "Residual Plant Footprint", value: parseFloat(residualEmissions.toFixed(2)), color: "#e11d48" }
          ].filter(b => b.value > 0),
          actionPlan: [
            owner === "owned" 
              ? "Procure standard CAPEX solar panels directly to maximize internal rate of return." 
              : "Execute a green Power Purchase Agreement (PPA) with a developer to avoid upfront CAPEX costs.",
            "Incorporate high-efficiency induction LED lighting grids to shave off another 5% grid energy demand.",
            "Purchase certified voluntary carbon credits (VCS/Gold Standard) to offset residual emissions for green certifications."
          ]
        };
      }
    }
  },
  {
    id: "esg-sustainability-reporting",
    name: "ESG & Sustainability Reporting",
    iconName: "FileText",
    oneLiner: "Organize ESG parameters and compile compliant, stakeholder-ready disclosures.",
    overview: "Establish structured, compliant Environmental, Social, and Governance (ESG) records. We aggregate shopfloor safety indices, contract labor benefits, board gender diversity ratios, and material recycling registers into clean, investor-ready report books.",
    businessProblems: [
      "Struggling to respond to complex EcoVadis or ESG scoring cards from corporate international buyers.",
      "Parent listed corporate requesting BRSR Core supplier disclosures from your factory.",
      "Lack of organized policies for human rights, labor protection, or hazardous chemical waste management."
    ],
    industriesServed: ["Heavy Foundries & Alloys", "Chemical Factories", "Apparel & Garment Weavers", "API Pharma Labs", "Automobile Tiers"],
    benefits: [
      "Secure high EcoVadis/ESG scores to cement long-term premium supply agreements.",
      "Qualify for concessional green loan interest lines from top commercial banks.",
      "Consolidate all compliance documentation inside a single, secure digital evidence folder."
    ],
    process: [
      { step: 1, name: "ESG Diagnostic", desc: "Our specialists audit your existing HR policies, safety records, and environmental controls." },
      { step: 2, name: "Gap Remediation", desc: "Receive direct policy draft templates and suggestions to resolve critical social or governance gaps." },
      { step: 3, name: "Data Aggregation", desc: "Securely log physical ESG parameters—such as injury-free days, wages, and recycling tons." },
      { step: 4, name: "Disclosures Release", desc: "Unlock a fully formatted, compliant BRSR or GRI ESG disclosure book ready for immediate distribution." }
    ],
    deliverables: [
      "Investor-Ready Corporate ESG Report (GRI/BRSR Map)",
      "EcoVadis Diagnostic Gap Assessment Report",
      "Custom Factory HR & Environmental Policy Templates Bundle",
      "Dynamic Stakeholder ESG Performance KPI Dashboard"
    ],
    requiredDocuments: [
      "Annual employee health & safety logs (injury registers)",
      "Equal opportunity wages and minimum wage checklists",
      "Board of directors registry showing gender splits",
      "Wastewater and hazardous chemical storage licenses"
    ],
    frameworks: ["GRI Standards (Global Reporting)", "SEBI BRSR Core Framework (India)", "EcoVadis CSR Rating Methodology", "UN Sustainable Development Goals (SDGs)"],
    timeline: "3-4 Weeks",
    faqs: [
      { q: "Is Balancing Carbon an ESG rating auditor?", a: "No, Balancing Carbon is an implementation partner. We compile, clean, and format your policy and metrics data so you score top grades on EcoVadis, BRSR, or rating audits." },
      { q: "What does the 'S' and 'G' in ESG mean for a manufacturing plant?", a: "The 'Social' (S) covers shopfloor safety, equal wages, and fair treatment of contract laborers. 'Governance' (G) covers having formal anti-bribery policies, board diversity, and clear ESG risk oversight." }
    ],
    assessmentConfig: {
      title: "ESG Baseline Readiness Scorecard",
      description: "Answer these 4 simple operational questions to evaluate your corporate ESG compliance readiness level.",
      inputs: [
        { id: "esgPolicy", label: "Do you have a written, board-signed Sustainability Policy?", type: "select", defaultValue: "no", options: [
          { label: "Yes, fully signed and public", value: "yes" },
          { label: "No formal written policy yet", value: "no" }
        ]},
        { id: "injuryRate", label: "Annual workplace recordable safety incidents", type: "number", defaultValue: 0, unit: "Incidents" },
        { id: "contractLabor", label: "Do you offer equal pension/health coverage to all contract laborers?", type: "select", defaultValue: "partial", options: [
          { label: "Yes, 100% equal coverage", value: "yes" },
          { label: "Partial / On-roll employees only", value: "partial" },
          { label: "No benefits coverage for contract labor", value: "no" }
        ]},
        { id: "recycleRate", label: "Percentage of manufacturing process waste recycled", type: "number", defaultValue: 30, unit: "%" }
      ],
      formula: (inputs) => {
        const policy = String(inputs.esgPolicy || "no");
        const injury = Number(inputs.injuryRate || 0);
        const labor = String(inputs.contractLabor || "partial");
        const recycle = Number(inputs.recycleRate || 0);

        let score = 50;
        if (policy === "yes") score += 15;
        if (injury === 0) score += 15;
        else if (injury > 3) score -= 10;
        if (labor === "yes") score += 15;
        if (labor === "partial") score += 5;
        score += Math.round(recycle / 5);

        score = Math.min(100, Math.max(10, score));

        let rating = "Bronze Level Readiness";
        let color = "#f97316";
        if (score >= 80) { rating = "Platinum Level Readiness"; color = "#3b82f6"; }
        else if (score >= 65) { rating = "Gold Level Readiness"; color = "#10b981"; }

        return {
          totalScore: score,
          unitLabel: "ESG Compliance Readiness Score",
          unitValue: `${score} / 100`,
          summaryText: `Your preliminary ESG score is evaluated at ${score}/100, placing you in the '${rating}' tier. Direct action on contract labor policies and formal board documentation offers the fastest path to achieve a platinum rating.`,
          breakdown: [
            { name: "Policy & Governance Core", value: policy === "yes" ? 25 : 5, color: "#a855f7" },
            { name: "Safety & Social Core", value: injury === 0 ? 30 : 15, color: "#10b981" },
            { name: "Contract Labor Alignment", value: labor === "yes" ? 25 : labor === "partial" ? 15 : 0, color: "#3b82f6" },
            { name: "Circular Environmental Core", value: Math.round(recycle / 2), color: "#f59e0b" }
          ].filter(b => b.value > 0),
          actionPlan: [
            policy === "no" 
              ? "Draft and adopt a formal environmental policy using our compliance SaaS templates." 
              : "Review policy parameters annually and release public links to win EcoVadis points.",
            labor !== "yes" 
              ? "Upgrade health/insurance benefit options for contract shopfloor laborers to align with BRSR Core mandates." 
              : "Maintain robust digital logs of contract benefit receipts for third-party review.",
            recycle < 60 
              ? "Partner with certified recyclers to boost waste circularity above 60%." 
              : "Acquire certified mass balance logs from recyclers to secure gold standard validation."
          ]
        };
      }
    }
  },
  {
    id: "sustainability-dashboard",
    name: "Sustainability Dashboard",
    iconName: "LayoutDashboard",
    oneLiner: "Real-time SaaS dashboard tracking carbon, water, waste, and ESG metrics.",
    overview: "Deploy a custom digital center that replaces messy spreadsheets with intuitive compliance data. Our platform lets you track carbon footprints, energy bills, water discharges, and waste registers in real time across multiple facilities.",
    businessProblems: [
      "Inability to spot sudden energy surges or water leaks across facilities until monthly utility bills arrive.",
      "Difficulty sharing up-to-date sustainability KPIs with corporate leaders, buyers, and board members.",
      "Scattered environmental files across folders, causing massive delay during unexpected external audits."
    ],
    industriesServed: ["Multi-Plant Manufacturers", "Automotive OEM Tier-1 Tiers", "Apparel & Garment Spinners", "Bio-Pharma Multi-Facilities", "Chemical Synthesis Plants"],
    benefits: [
      "Consolidate all environmental metrics into a single, high-end visual control board.",
      "Receive real-time alerts when plant electricity power factors drop below 0.90.",
      "Instantly export structured draft reports with the click of a single button."
    ],
    process: [
      { step: 1, name: "Facility Onboarding", desc: "Register your facilities, energy meters, and data coordinators on our secure SaaS platform." },
      { step: 2, name: "Template Standardization", desc: "Deploy pre-configured Excel/API data collection templates for your utilities team." },
      { step: 3, name: "Active Data Entry", desc: "Data managers log monthly or weekly fuel, water, and waste logs directly into the system." },
      { step: 4, name: "Live Dashboard Launch", desc: "Publish your live dashboard, enabling leadership to track emissions and download reports." }
    ],
    deliverables: [
      "Custom Plant-by-Plant SaaS Sustainability Dashboard",
      "Automated Monthly ESG KPI Report Generator",
      "Secure Digital Audit-Evidence Repository System",
      "Electricity Bill Anomaly & Power Factor Alert Engine"
    ],
    requiredDocuments: [
      "Plant location maps and coordinator rosters",
      "Monthly utility electricity meter logs",
      "Monthly water meter readings",
      "Monthly hazardous/municipal waste weighing slips"
    ],
    frameworks: ["ISO 14064 Carbon reporting", "ISO 50001 Energy tracking", "GRI Sustainability Disclosures", "WBCSD Water Tool Protocols"],
    timeline: "1-2 Weeks",
    faqs: [
      { q: "Is hardware or smart meter installation required?", a: "No smart hardware is required. While our platform supports direct integrations, it is designed to run beautifully on simple, monthly manual utility invoice data uploads." },
      { q: "Can we restrict access to sensitive cost metrics?", a: "Yes, our SaaS features robust role-based access controls. You can allow coordinators to enter raw volumes while restricting financial cost data to plant heads." }
    ],
    assessmentConfig: {
      title: "SaaS Dashboard Deployment Estimator",
      description: "Estimate the deployment scope and time required to launch a custom dashboard for your facilities.",
      inputs: [
        { id: "facilitiesNum", label: "Number of Active Manufacturing Plants", type: "number", defaultValue: 2, unit: "Plants" },
        { id: "dataMeters", label: "Approximate Number of Electricity Sub-Meters", type: "number", defaultValue: 10, unit: "Meters" },
        { id: "reportingFrequency", label: "Data Reporting Frequency", type: "select", defaultValue: "monthly", options: [
          { label: "Monthly Data Aggregation", value: "monthly" },
          { label: "Weekly Granular Logs", value: "weekly" },
          { label: "Real-Time Smart Integration", value: "real-time" }
        ]}
      ],
      formula: (inputs) => {
        const plants = Number(inputs.facilitiesNum || 1);
        const meters = Number(inputs.dataMeters || 1);
        const freq = String(inputs.reportingFrequency || "monthly");

        let setupDays = plants * 4;
        if (freq === "weekly") setupDays += 3;
        if (freq === "real-time") setupDays += 10;

        const feeEstimate = (plants * 15000) + (meters * 2000);

        return {
          totalScore: Math.min(100, Math.max(20, 100 - setupDays)),
          unitLabel: "Deployment Timeline & Estimated Cost",
          unitValue: `${setupDays} Days Setup`,
          summaryText: `Your estimated setup timeline is ${setupDays} days across your ${plants} plant(s). The annual SaaS subscription package is estimated at ${feeEstimate.toLocaleString()} INR, including secure multi-user logins.`,
          breakdown: [
            { name: "Plant Configuration Setup", value: plants * 15000, color: "#3b82f6" },
            { name: "Meter Log Mapping Setup", value: meters * 2000, color: "#a855f7" },
            { name: "Audit evidence folder creation", value: 5000, color: "#10b981" }
          ].filter(b => b.value > 0),
          actionPlan: [
            "Appoint 1 EHS coordinator per plant to manage utility log uploads.",
            "Consolidate plant electricity single-line diagrams to structure sub-meter tracking.",
            "Launch with monthly uploads first, then scale up to weekly tracking as data quality stabilizes."
          ]
        };
      }
    }
  },
  {
    id: "energy-management",
    name: "Energy Management",
    iconName: "Zap",
    oneLiner: "Analyze thermodynamics and electrical systems to slash energy bills and Scope 2 carbon.",
    overview: "Conduct rigorous energy audits that find hidden waste. We audit your plant's power factors, transformer loads, combustion furnaces, and air compressors to deliver actionable projects that cut electricity costs.",
    businessProblems: [
      "Soaring electricity bills and fuel combustion costs eating into manufacturing profit margins.",
      "Frequent penalties from electricity boards due to plant power factors dipping below 0.90.",
      "Operating older, inefficient motor grids without concrete data to justify high-efficiency IE3/IE4 upgrades."
    ],
    industriesServed: ["Iron & Steel Foundries", "Aluminum Smelters", "Chemical Pigment Plants", "Textile Spinning Mills", "Glass & Ceramics Manufacturing"],
    benefits: [
      "Reduce electricity bills and thermal fuel consumption by 12% to 25% annually.",
      "Eliminate power board utility penalties by keeping plant power factors close to unity.",
      "Secure clear return-on-investment (ROI) calculations for motor and burner retrofits."
    ],
    process: [
      { step: 1, name: "Load Audit", desc: "Log plant connected kVA ratings, transformer loads, and sub-meter logging data." },
      { step: 2, name: "Efficiency Analysis", desc: "Map thermodynamic boiler performance and compressor pressure drops against operating logs." },
      { step: 3, name: "Savings Blueprint", desc: "Identify payback periods for projects like waste heat recovery, capacitor banks, and solar energy." },
      { step: 4, name: "Audit Ledger Lock", desc: "Receive a verified ISO 50001-aligned Energy Audit Report containing direct saving recommendations." }
    ],
    deliverables: [
      "ISO 50001-Compliant Plant Energy Audit Report",
      "Opportunity Savings Register with exact ROI Math",
      "Electrical Grid Load Anomaly Diagnostics Map",
      "Capacitor Bank Power Factor Correction Plan"
    ],
    requiredDocuments: [
      "12-Month electricity board contract invoices",
      "Plant electrical single-line diagram (SLD)",
      "Boiler and furnace combustion test sheets",
      "Nameplate ratings of major motors (>15 kW)"
    ],
    frameworks: ["ISO 50001:2018 (Energy Management)", "BEE India Audit Guidelines", "Energy Conservation Act 2001"],
    timeline: "2-3 Weeks",
    faqs: [
      { q: "Is this a physical on-site audit?", a: "Yes, our experienced, BEE-certified energy managers conduct comprehensive site visits to measure active load factors, check compressor leaks, and analyze furnace draft thermodynamics." },
      { q: "What is the average payback period for recommendations?", a: "Over 70% of our energy recommendations—like compressor pressure adjustments or capacitor additions—have a payback period of under 6 months." }
    ],
    assessmentConfig: {
      title: "Industrial Energy Savings Estimator",
      description: "Enter your plant's electrical load specifications to evaluate potential energy and bill savings.",
      inputs: [
        { id: "plantLoad", label: "Connected Plant Electrical Load", type: "number", defaultValue: 500, unit: "kVA" },
        { id: "powerFactor", label: "Current Plant Power Factor (PF)", type: "number", defaultValue: 0.86, unit: "cos φ" },
        { id: "motorRatio", label: "IE3/IE4 High-Efficiency Motors Ratio", type: "number", defaultValue: 20, unit: "%" },
        { id: "heatRecovery", label: "Do you have boiler/furnace heat recuperators?", type: "select", defaultValue: "no", options: [
          { label: "No, furnace exhaust heat is wasted", value: "no" },
          { label: "Yes, recuperators active", value: "yes" }
        ]}
      ],
      formula: (inputs) => {
        const load = Number(inputs.plantLoad || 0);
        const pf = Number(inputs.powerFactor || 0.85);
        const motors = Number(inputs.motorRatio || 0);
        const heat = String(inputs.heatRecovery || "no");

        const annualConsumptionKwh = load * 0.7 * 8760 * 0.6; // assume 60% load factor
        let savingsKwh = 0;

        // PF improvement to 0.99 saves ~4% in line losses
        if (pf < 0.92) savingsKwh += (annualConsumptionKwh * 0.04);
        // IE3 upgrading can save ~6% of motor load (assuming motors constitute 65% of load)
        if (motors < 60) savingsKwh += (annualConsumptionKwh * 0.65 * 0.06 * (1 - motors/100));
        // Heat recovery saves thermal fuel, let's translate to grid equivalent (~5% furnace load saved)
        if (heat === "no") savingsKwh += (annualConsumptionKwh * 0.05);

        const rupeesSaved = parseFloat(((savingsKwh * 8.5) / 100000).toFixed(2)); // 8.5 INR/kWh, shown in Lakhs
        const co2Avoided = parseFloat(((savingsKwh * 0.82) / 1000).toFixed(2)); // avoided Tons

        return {
          carbonTons: co2Avoided,
          unitLabel: "Estimated Annual Savings",
          unitValue: `₹${rupeesSaved} Lakhs / Year`,
          summaryText: `Your plant has the potential to save up to ${Math.round(savingsKwh).toLocaleString()} kWh of electricity annually, avoiding ${co2Avoided} tCO₂e and saving ₹${rupeesSaved} Lakhs in power tariffs.`,
          breakdown: [
            { name: "Power Factor Correction", value: pf < 0.92 ? rupeesSaved * 0.2 : 0, color: "#3b82f6" },
            { name: "High-Efficiency Motors Upgrade", value: motors < 60 ? rupeesSaved * 0.45 : 0, color: "#10b981" },
            { name: "Exhaust Waste Heat Recovery", value: heat === "no" ? rupeesSaved * 0.35 : 0, color: "#a855f7" }
          ].filter(b => b.value > 0),
          actionPlan: [
            pf < 0.95 
              ? "Install APFC (Automatic Power Factor Correction) panels to achieve 0.99 PF and eliminate line loss penalties." 
              : "Monitor APFC capacitors quarterly to prevent degradation.",
            motors < 50 
              ? "Replace burnt-out standard motors with premium IE4 efficiency motors for continuous conveyor/fan applications." 
              : "Ensure high IE3/IE4 motor ratio is preserved during plant maintenance.",
            heat === "no" 
              ? "Install a recuperator heat exchanger on boiler flue pipes to pre-heat combustion intake air." 
              : "Inspect existing recuperators for scale buildup to sustain thermal transfer rates."
          ]
        };
      }
    }
  },
  {
    id: "water-management",
    name: "Water Management",
    iconName: "Droplet",
    oneLiner: "Establish factory water balances and optimize zero-liquid-discharge (ZLD) systems.",
    overview: "Optimize industrial water intakes and effluent treatment. We audit plant water intakes, cooling towers, dye baths, and effluent plants to design closed-loops that lower borewell water usage and sewage costs.",
    businessProblems: [
      "Sudden groundwater water-level drops halting high-volume textile or chemical operations.",
      "Strict local pollution board (PCB) inspections threatened by poor wastewater discharge monitoring.",
      "Exorbitant monthly tanker charges to supplement insufficient plant borewell volumes."
    ],
    industriesServed: ["Textile Processing & Dyeing", "Chemical Factories", "Bio-Pharma API Labs", "Paper & Pulp Mills", "Beverages & Agri-Processing"],
    benefits: [
      "Cut fresh borewell and tanker intake charges by up to 45% using water recycle systems.",
      "Structure wastewater discharge data for review, reducing unresolved regulatory data gaps.",
      "Map out a precise plant Water Balance Chart required for official state pollution clearances."
    ],
    process: [
      { step: 1, name: "Intake Mapping", desc: "Install temporary ultrasonic sensors or check meter dockets to map fresh water intakes." },
      { step: 2, name: "Balance Calculation", desc: "Audit water usage across cooling towers, processing tanks, washing bays, and evaporation losses." },
      { step: 3, name: "Treatment Review", desc: "Evaluate effluent plant (ETP/STP) efficiency and analyze recycled water quality." },
      { step: 4, name: "Water Ledger Summary", desc: "Unlock your calculated water balance layout and receive actionable recycling recommendations." }
    ],
    deliverables: [
      "Official Plant Water Balance Flowchart Diagram",
      "Wastewater ETP/STP Diagnostic Efficiency Report",
      "Borewell Groundwater Conservation Blueprint",
      "Rainwater Harvesting Potential Feasibility Study"
    ],
    requiredDocuments: [
      "Borewell permission licenses from local CGWA boards",
      "Daily water consumption register files",
      "Effluent treatment plant (ETP) capacity records",
      "Wastewater test report documents (BOD, COD, pH)"
    ],
    frameworks: ["CGWA Water Guidelines (India)", "ZDHC Wastewater Standards", "ISO 14046 (Water Footprint)"],
    timeline: "2-3 Weeks",
    faqs: [
      { q: "What is ZLD (Zero Liquid Discharge)?", a: "ZLD is an advanced wastewater treatment process that recycles 100% of industrial effluent, leaving absolutely zero liquid discharge. It is highly valued and often mandated in textile and pigment manufacturing." },
      { q: "Does water recycling increase electrical utility costs?", a: "While advanced filtration (like RO) uses grid energy, we audit and design gravity-fed cascades and recovery units to ensure water savings far outweigh electrical costs." }
    ],
    assessmentConfig: {
      title: "Industrial Water Balance & Savings Estimator",
      description: "Model your daily water intake and effluent recycle loops to identify groundwater reduction potential.",
      inputs: [
        { id: "dailyIntake", label: "Daily Fresh Water Intake (Borewell/Tankers)", type: "number", defaultValue: 80, unit: "kL (KiloLitres)" },
        { id: "dailyDischarge", label: "Daily Wastewater Effluent Volume", type: "number", defaultValue: 60, unit: "kL" },
        { id: "etpRecycle", label: "Current Effluent Recycling Ratio", type: "number", defaultValue: 20, unit: "%" },
        { id: "rainHarvesting", label: "Do you have active Rainwater Harvesting?", type: "select", defaultValue: "no", options: [
          { label: "No active rainwater system", value: "no" },
          { label: "Yes, active harvesting tanks", value: "yes" }
        ]}
      ],
      formula: (inputs) => {
        const intake = Number(inputs.dailyIntake || 0);
        const discharge = Number(inputs.dailyDischarge || 0);
        const recycle = Number(inputs.etpRecycle || 0);
        const rain = String(inputs.rainHarvesting || "no");

        const currentRecycledVol = discharge * (recycle / 100);
        // Potential to optimize recycling to 80% (industry benchmark)
        const targetRecycledVol = discharge * 0.8;
        const incrementalRecyclePotential = Math.max(0, targetRecycledVol - currentRecycledVol);

        // Assume fresh tanker water cost = 120 INR per kL
        const annualMonetarySavings = parseFloat(((incrementalRecyclePotential * 300 * 120) / 100000).toFixed(2)); // Lakhs INR annually (assuming 300 days operation)
        // Water footprint offset: 0.32 kg CO2e saved per kL recycled
        const co2Savings = parseFloat(((incrementalRecyclePotential * 300 * 0.32) / 1000).toFixed(2)); // Tons CO2e

        return {
          carbonTons: co2Savings,
          unitLabel: "Tanker Water Cost Savings",
          unitValue: `₹${annualMonetarySavings} Lakhs / Year`,
          summaryText: `By upgrading your effluent treatment filtration and achieving an 80% water recycling ratio, you can save ${Math.round(incrementalRecyclePotential * 300).toLocaleString()} kL of fresh water annually, cutting costs by ₹${annualMonetarySavings} Lakhs.`,
          breakdown: [
            { name: "ETP Filtration Optimization", value: annualMonetarySavings * 0.75, color: "#3b82f6" },
            { name: "Rainwater Intake Substitution", value: rain === "no" ? annualMonetarySavings * 0.25 : 0, color: "#10b981" }
          ].filter(b => b.value > 0),
          actionPlan: [
            recycle < 75 
              ? "Install a secondary sand/carbon filtration stage and multi-effect evaporators to boost ETP recovery to 80%." 
              : "Maintain ETP chemical dosing logs diligently to avoid membrane scaling.",
            rain === "no" 
              ? "Deploy a rooftop rainwater catchment pipeline linking to active recharge wells to substitute borewell intake." 
              : "Clean rainwater sand filters before the monsoon season to sustain percolation rates."
          ]
        };
      }
    }
  },
  {
    id: "waste-circular-economy",
    name: "Waste & Circular Economy",
    iconName: "RefreshCw",
    oneLiner: "Track waste streams and redesign operations to improve recycling and resource circularity.",
    overview: "Map and reduce industrial waste. We review raw packaging scrap, stamping slags, chemical bypasses, and hazardous foundry muds to create documented circular waste processes that lower disposal costs.",
    businessProblems: [
      "High monthly disposal fees for scrap metals, plastics, or chemical slag products.",
      "Risk of regulatory penalties due to improper hazardous waste segregation or disposal.",
      "Buyer mandates demanding documentation showing the plant's plastic or metal waste recycling rate."
    ],
    industriesServed: ["Heavy Castings & Alloys", "Apparel & Garment Spinners", "Plastics Molding Factories", "Industrial Packaging", "Chemical Factories"],
    benefits: [
      "Convert scrap waste into revenue streams by selling segregated materials to certified recyclers.",
      "Ensure 100% compliance with hazardous waste storage guidelines, removing the risk of GPCB fines.",
      "Support buyer conversations with documented waste diversion evidence."
    ],
    process: [
      { step: 1, name: "Waste Mapping", desc: "Audit and catalog all solid, liquid, and hazardous waste streams produced." },
      { step: 2, name: "Segregation Audit", desc: "Evaluate shopfloor sorting procedures and check for mixing of recyclables with hazardous slags." },
      { step: 3, name: "Recycler Verification", desc: "Verify downstream recyclers, ensuring they hold active pollution board clearances." },
      { step: 4, name: "Circularity Release", desc: "Unlock your calculated Circular Waste Index and receive actionable segregation blueprints." }
    ],
    deliverables: [
      "Plant Solid & Hazardous Waste Balance Ledger",
      "Downstream Recycler Compliance Verification Report",
      "Shopfloor Waste Segregation Operational Standard (SOP)",
      "Zero Waste to Landfill (ZWTL) Implementation Roadmap"
    ],
    requiredDocuments: [
      "Hazardous waste manifest slips (Form 10 logs)",
      "Weighbridge scrap sale ledger dockets",
      "Recycling supplier authorization certificates",
      "Pollution Control Board hazardous storage permits"
    ],
    frameworks: ["Hazardous Waste Rules 2016 (India)", "ISO 14040/44 (Circular Flows)", "UL 2799 (Zero Waste to Landfill Standard)"],
    timeline: "2-3 Weeks",
    faqs: [
      { q: "What is Zero Waste to Landfill (ZWTL)?", a: "ZWTL is a standard verifying that a manufacturing plant diverts at least 90% of its total waste from landfills to reuse, recycling, or compost systems." },
      { q: "How do you verify downstream recyclers?", a: "We audit recyclers' licenses to ensure they hold valid Pollution Control Board (PCB) consents to operate. This protects your plant from secondary liability." }
    ],
    assessmentConfig: {
      title: "Circular Waste & Recycling Solver",
      description: "Audit your shopfloor waste streams to evaluate your waste circularity score and find cost-saving opportunities.",
      inputs: [
        { id: "hazardousWaste", label: "Monthly Hazardous/Slag Waste Generated", type: "number", defaultValue: 5, unit: "Tons" },
        { id: "segregationRatio", label: "Percentage of Non-Hazardous Scrap Segregated", type: "number", defaultValue: 50, unit: "%" },
        { id: "scrapSellerLic", label: "Are your scrap recyclers formally certified?", type: "select", defaultValue: "partial", options: [
          { label: "Yes, 100% certified by PCB", value: "yes" },
          { label: "Partial / Informal scrap dealers", value: "partial" },
          { label: "No licenses checked yet", value: "no" }
        ]}
      ],
      formula: (inputs) => {
        const haz = Number(inputs.hazardousWaste || 0);
        const seg = Number(inputs.segregationRatio || 0);
        const lic = String(inputs.scrapSellerLic || "partial");

        const circularityScore = Math.min(100, Math.max(10, Math.round((seg * 0.7) + (lic === "yes" ? 30 : lic === "partial" ? 15 : 0))));
        // Assume sorting segregation from scrap could yield ₹8,000 per ton in resale
        const potentialRevenueLakhs = parseFloat(((seg < 90 ? (90 - seg) * 0.12 * haz * 12 * 8000 : 0) / 100000).toFixed(2));

        return {
          totalScore: circularityScore,
          unitLabel: "Waste Circularity Compliance Score",
          unitValue: `${circularityScore} / 100`,
          summaryText: `Your plant's waste circularity score is ${circularityScore}/100. Improving segregation and formalizing recycler contracts could unlock up to ₹${potentialRevenueLakhs} Lakhs in scrap resale revenue annually.`,
          breakdown: [
            { name: "Recycling Segregation Rate", value: Math.round(seg * 0.7), color: "#10b981" },
            { name: "Recycler Licensing Core", value: lic === "yes" ? 30 : lic === "partial" ? 15 : 0, color: "#3b82f6" }
          ].filter(b => b.value > 0),
          actionPlan: [
            seg < 85 
              ? "Deploy color-coded sorting bins directly on the shopfloor for cardboard, plastics, and steel scraps." 
              : "Monitor sorting volumes weekly to maintain high segregation ratios.",
            lic !== "yes" 
              ? "Transition scrap sales exclusively to recyclers with active Pollution Control Board (PCB) certifications." 
              : "Secure official recycling manifests for all sold scrap to clear external audits easily."
          ]
        };
      }
    }
  },
  {
    id: "supplier-sustainability",
    name: "Supplier Sustainability",
    iconName: "Users",
    oneLiner: "Establish supplier portals, collect data, and score vendor sustainability portfolios.",
    overview: "Establish structured supplier sustainability records. We set up supplier portals, compile greenhouse gas intensity data, and evaluate vendor environmental compliance, preparing you for Scope 3 audits.",
    businessProblems: [
      "Inability to calculate your Scope 3 emissions due to complete lack of data from suppliers.",
      "Risk of supplying carbon-intensive materials that trigger massive export tariffs.",
      "Failing customer audits because upstream suppliers use child labor or dump chemical waste."
    ],
    industriesServed: ["Tier-1 Automobile Suppliers", "Electronics Manufacturers", "Chemical Formulators", "Textile Apparel Brands", "Infrastructure Developers"],
    benefits: [
      "Calculate structured Scope 3 emission estimates for review.",
      "Isolate carbon-intensive suppliers to purchase raw components with low carbon intensity.",
      "Protect your brand from supplier environmental scandals or regulatory crackdowns."
    ],
    process: [
      { step: 1, name: "Portal Setup", desc: "Launch a custom supplier data intake portal branded with your factory guidelines." },
      { step: 2, name: "Campaign Launch", desc: "Issue direct sustainability questionnaires and data collection logs to your suppliers." },
      { step: 3, name: "Evidence Audit", desc: "Our specialists audit supplier utility invoices, mill test certificates, and environmental consents." },
      { step: 4, name: "Scorecard Release", desc: "View the live supplier dashboard and track vendor carbon scores across material inputs." }
    ],
    requiredDocuments: [
      "List of primary active material suppliers",
      "Supplier contact information and rosters",
      "Sample supplier procurement specifications",
      "Transporter freight log sheets"
    ],
    frameworks: ["GHG Protocol Scope 3 Standard", "ISO 20400:2017 (Sustainable Procurement)", "CDP Supply Chain Program Rules"],
    timeline: "3-4 Weeks",
    faqs: [
      { q: "Do suppliers require expensive software to participate?", a: "No, suppliers access our clean, web-based portal entirely for free. We use simple, scannable forms that take them minutes to complete." },
      { q: "What if a supplier refuses to share carbon data?", a: "Our platform pre-populates industry-standard regional default values first, enabling you to estimate Scope 3 footprint while we coordinate with the supplier to refine data." }
    ],
    assessmentConfig: {
      title: "Supplier Sustainability Exposure Solver",
      description: "Estimate the percentage of your supply chain carbon emissions covered by vendor-submitted data.",
      inputs: [
        { id: "supplierCount", label: "Number of Active Primary Suppliers", type: "number", defaultValue: 15, unit: "Suppliers" },
        { id: "surveyParticipation", label: "Percentage of Suppliers Sharing Data", type: "number", defaultValue: 40, unit: "%" },
        { id: "supplierAudit", label: "Do you audit supplier environmental licenses?", type: "select", defaultValue: "no", options: [
          { label: "No, we rely entirely on supplier claims", value: "no" },
          { label: "Yes, we audit environmental consents", value: "yes" }
        ]}
      ],
      formula: (inputs) => {
        const suppliers = Number(inputs.supplierCount || 1);
        const participation = Number(inputs.surveyParticipation || 0);
        const audit = String(inputs.supplierAudit || "no");

        const coverageScore = Math.min(100, Math.max(10, Math.round((participation * 0.7) + (audit === "yes" ? 30 : 0))));

        return {
          totalScore: coverageScore,
          unitLabel: "Supply Chain Coverage Score",
          unitValue: `${coverageScore} / 100`,
          summaryText: `Your supplier carbon data coverage is evaluated at ${coverageScore}/100. Transitioning your top 5 high-volume suppliers to submit primary data is the fastest way to improve Scope 3 coverage.`,
          breakdown: [
            { name: "Active Vendor Participation", value: Math.round(participation * 0.7), color: "#3b82f6" },
            { name: "Compliance License Validation", value: audit === "yes" ? 30 : 0, color: "#10b981" }
          ].filter(b => b.value > 0),
          actionPlan: [
            participation < 70 
              ? "Include sustainability data sharing as a standard requirement in upcoming procurement renewal contracts." 
              : "Incentivize top performing suppliers with preferred vendor status.",
            audit === "no" 
              ? "Draft a formal Supplier Code of Conduct template and require suppliers to sign it." 
              : "Verify supplier pollution consent forms inside your compliance workspace."
          ]
        };
      }
    }
  },
  {
    id: "compliance-readiness",
    name: "Compliance Readiness",
    iconName: "Award",
    oneLiner: "Prepare operations and documents for EU CBAM, BRSR, and buyer audits.",
    overview: "Secure compliance before auditing deadlines. We map operations, evaluate gap assessments, and assemble evidence repositories to protect your export business from carbon tariffs and supply blocks.",
    businessProblems: [
      "Risk of massive EU CBAM border tax penalties on exported steel, cement, or polymers.",
      "Export shipments held at European custom checkpoints due to a lack of carbon intensity declarations.",
      "Inability to complete complex customer-mandated ESG questionnaires, risking lost contracts."
    ],
    industriesServed: ["Exporting Steel Foundries", "Aluminum Extrusions", "Apparel & Garments Exporters", "API Pharmaceutical Labs", "Polymer Extrusions"],
    benefits: [
      "Avoid severe EU CBAM carbon tax penalties on exported manufactured parts.",
      "Clear export customs smoothly with bulletproof compliance data.",
      "Save weeks of compliance effort by automating report compiling using our SaaS tools."
    ],
    process: [
      { step: 1, name: "Compliance Map", desc: "Our compliance team maps your export profiles against EU CBAM, Higg, or BRSR rules." },
      { step: 2, name: "Gap Evaluation", desc: "Identify missing data logs, uncertified suppliers, or non-compliant testing records." },
      { step: 3, name: "Evidence Assembly", desc: "Aggregate and secure utility bills, combustion logs, and certificates inside our repository." },
      { step: 4, name: "Review Package", desc: "Compile a structured review package with evidence logs and calculation references." }
    ],
    requiredDocuments: [
      "Quarterly export shipping bills and bills of lading",
      "Process combustion and thermal fuel logs",
      "MTC sheets for precursors and imported scrap steel",
      "Electricity grid bills and CEA emission data sheets"
    ],
    frameworks: ["EU Carbon Border Adjustment (CBAM)", "Higg Facility Environmental Module", "SEBI BRSR Core Mandates", "EcoVadis CSR Audit Specifications"],
    timeline: "2-3 Weeks",
    faqs: [
      { q: "When do the EU CBAM monetary tax penalties start?", a: "The transitional CBAM reporting is currently active. Actual carbon tax payments begin on January 1, 2026. Non-compliance triggers severe custom delays and fines." },
      { q: "Can Balancing Carbon represent my business during a buyer audit?", a: "Yes, our audit-readiness package includes dedicated audit support where our lead environmental assessors coordinate directly with your buyer's verification team." }
    ],
    assessmentConfig: {
      title: "EU CBAM / Export Compliance Solver",
      description: "Estimate your plant's compliance readiness and potential carbon tariff exposure.",
      inputs: [
        { id: "exportVolume", label: "Annual Exports to EU/Global Buyers", type: "number", defaultValue: 400, unit: "Tons" },
        { id: "carbonIntensity", label: "Average Precursor Carbon Intensity", type: "number", defaultValue: 1.8, unit: "tCO2e/ton" },
        { id: "cbamStatus", label: "Do you have active quarterly carbon declarations?", type: "select", defaultValue: "no", options: [
          { label: "No, we have not filed declarations", value: "no" },
          { label: "Yes, we file quarterly declarations", value: "yes" }
        ]}
      ],
      formula: (inputs) => {
        const volume = Number(inputs.exportVolume || 0);
        const intensity = Number(inputs.carbonIntensity || 1.8);
        const status = String(inputs.cbamStatus || "no");

        const cbamReadiness = status === "yes" ? 90 : 35;
        // Assume potential EU CBAM carbon price penalization of 80 EUR (~7200 INR) per ton of excess embedded carbon
        const potentialTariffINR = parseFloat(((volume * intensity * 7200) / 100000).toFixed(2)); // Lakhs INR exposure

        return {
          totalScore: cbamReadiness,
          unitLabel: "Export Carbon Tariff Exposure",
          unitValue: status === "yes" ? "Minimal Exposure" : `₹${potentialTariffINR} Lakhs Exposure`,
          summaryText: `Your compliance readiness score is ${cbamReadiness}/100. Operating without quarterly declarations leaves you with a potential tariff exposure of ₹${potentialTariffINR} Lakhs annually.`,
          breakdown: [
            { name: "Compliance Readiness Core", value: status === "yes" ? 60 : 20, color: "#10b981" },
            { name: "Tariff Exposure Risk", value: status === "yes" ? 30 : 15, color: "#ef4444" }
          ].filter(b => b.value > 0),
          actionPlan: [
            status === "no" 
              ? "Initiate a comprehensive cradle-to-gate carbon declaration immediately to bypass customs checks." 
              : "Verify energy logs quarterly to maintain accurate intensity declarations.",
            "Formulate detailed mill certificates from suppliers to prove low precursors intensity."
          ]
        };
      }
    }
  },
  {
    id: "sustainability-training",
    name: "Sustainability Training & Advisory",
    iconName: "BookOpen",
    oneLiner: "Train operations teams and design green SOPs to sustain compliance.",
    overview: "Equip your teams with practical carbon accounting skills. We run customized EHS workshops, author energy SOPs, and train operations managers to ensure continuous compliance on your factory shopfloor.",
    businessProblems: [
      "EHS and utility teams struggling with carbon calculations or wastewater sampling protocols.",
      "High shopfloor employee turnover causing key compliance steps to be missed.",
      "Difficulty keeping plant personnel aligned with international chemical safety standards."
    ],
    industriesServed: ["Heavy Foundries & Alloys", "Chemical Factories", "Textile Apparels", "API Pharma Labs", "Automobile Tier Tiers"],
    benefits: [
      "Empower your shopfloor team to manage and compile raw carbon metrics independently.",
      "Ensure EHS and chemical managers hold compliant, updated safety certifications.",
      "Establish written, repeatable sustainability SOPs that survive personnel changes."
    ],
    process: [
      { step: 1, name: "Needs Audit", desc: "Evaluate your shopfloor workforce's existing compliance knowledge and credentials." },
      { step: 2, name: "Curriculum Design", desc: "Design customized training material mapped directly to your plant's processes." },
      { step: 3, name: "Interactive Workshops", desc: "Deliver hands-on chemical safety, carbon calculation, or water balance workshops." },
      { step: 4, name: "SOP & Certificate Sign-off", desc: "Draft repeatable environmental SOPs and issue participation certificates to your team." }
    ],
    deliverables: [
      "Custom Plant Environmental Compliance SOPs Manual",
      "Workforce Carbon Accounting Training Slide Packages",
      "Chemical Safety & EHS Hazard Guidebooks",
      "Employee Sustainability Workshop Certificates"
    ],
    requiredDocuments: [
      "Current plant workforce rosters",
      "Existing chemical hazard SOP sheets",
      "EHS manager qualification records",
      "Utility logs coordination rosters"
    ],
    frameworks: ["ISO 14064 Compliance training", "OSHA Safety Guidelines", "ZDHC Chemical Safety Protocols", "BEE India Capacity Building"],
    timeline: "1-2 Weeks",
    faqs: [
      { q: "Are workshops delivered on-site or online?", a: "We offer both online and hands-on, on-site workshops directly on your factory shopfloor. On-site sessions are highly recommended for chemical safety training." },
      { q: "Do you offer certificates upon completion?", a: "Yes, all participants receive official Balancing Carbon certificates upon completing courses and passing our practical compliance quizzes." }
    ],
    assessmentConfig: {
      title: "Workforce Training & SOP Scope Solver",
      description: "Model your plant's workforce configuration to evaluate target training and SOP development scope.",
      inputs: [
        { id: "workforceCount", label: "Number of Active Shopfloor Personnel", type: "number", defaultValue: 45, unit: "Employees" },
        { id: "ehsLeadStatus", label: "Do you have an active dedicated EHS lead?", type: "select", defaultValue: "no", options: [
          { label: "No dedicated EHS manager", value: "no" },
          { label: "Yes, dedicated EHS manager active", value: "yes" }
        ]},
        { id: "sopAvailability", label: "Are there written chemical/energy SOPs?", type: "select", defaultValue: "partial", options: [
          { label: "No written SOPs available", value: "no" },
          { label: "Some draft SOPs exist", value: "partial" },
          { label: "Yes, complete verified SOPs active", value: "yes" }
        ]}
      ],
      formula: (inputs) => {
        const personnel = Number(inputs.workforceCount || 0);
        const lead = String(inputs.ehsLeadStatus || "no");
        const sop = String(inputs.sopAvailability || "partial");

        const skillReadiness = Math.min(100, Math.max(10, Math.round((lead === "yes" ? 40 : 10) + (sop === "yes" ? 40 : sop === "partial" ? 20 : 0) + Math.min(personnel / 2, 20))));
        const targetModulesCount = lead === "no" ? 4 : 2;

        return {
          totalScore: skillReadiness,
          unitLabel: "Workforce Compliance Skill Readiness",
          unitValue: `${skillReadiness} / 100`,
          summaryText: `Your team's compliance readiness is scored at ${skillReadiness}/100. Implementing EHS training workshops and authoring solid waste/chemical SOPs is highly recommended to secure operations.`,
          breakdown: [
            { name: "EHS Leadership Core", value: lead === "yes" ? 40 : 10, color: "#3b82f6" },
            { name: "Repeatable SOP Systems", value: sop === "yes" ? 40 : sop === "partial" ? 20 : 0, color: "#a855f7" },
            { name: "Workforce Capability Core", value: Math.round(Math.min(personnel / 2, 20)), color: "#10b981" }
          ].filter(b => b.value > 0),
          actionPlan: [
            lead === "no" 
              ? "Designate an operations supervisor to lead monthly sustainability compliance logs." 
              : "Incorporate carbon ledger tracking into the EHS manager's key performance metrics.",
            sop !== "yes" 
              ? "Author standard operating procedures (SOPs) for weekly boiler readings and chemical registers." 
              : "Verify that shopfloor operators follow written recycling segregation checklists."
          ]
        };
      }
    }
  }
];
