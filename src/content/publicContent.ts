export type PublicContentKind = "service" | "industry" | "ai" | "tool" | "insight" | "case-study";

export interface PublicContentItem {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  description: string;
  highlights: string[];
  challenges?: string[];
  methodology?: string[];
  deliverables?: string[];
  frameworks?: string[];
  timeline?: string;
  related?: string[];
  seoTitle?: string;
  seoDescription?: string;
  status?: string;
}

export const serviceContent: PublicContentItem[] = [
  {
    slug: "ghg-accounting",
    title: "GHG Accounting and Carbon Inventory",
    eyebrow: "Measure",
    summary: "Build an evidence-linked Scope 1, 2 and 3 inventory that can stand up to internal review and external assurance.",
    description: "Balancing Carbon connects facility activity, emission factors, calculations and supporting documents in one governed carbon ledger. Teams can move from disconnected spreadsheets to a repeatable reporting process without losing calculation lineage.",
    highlights: ["Facility and organisation roll-ups", "Location and market-based Scope 2", "Factor versioning and audit trail", "Review and approval workflows"],
    challenges: ["Scattered utility and fuel records", "Unclear factor ownership", "Inconsistent reporting boundaries", "Manual consolidation across facilities"],
    methodology: ["Confirm organisational and operational boundaries", "Map sources to scopes and categories", "Normalise activity data into canonical units", "Apply versioned factors and review exceptions", "Approve and lock the reporting period"],
    deliverables: ["Corporate GHG inventory", "Facility source register", "Calculation workbook export", "Evidence and data-quality register", "Management summary"],
    frameworks: ["GHG Protocol Corporate Standard", "ISO 14064-1 aligned workflow", "IPCC factor references", "India CEA electricity factor support"],
    timeline: "Typical implementation: 3-8 weeks, depending on facility count and data readiness.",
    related: ["scope-1-2-calculator", "emission-factor-database", "carbon-report-generator"],
  },
  {
    slug: "product-carbon-footprint",
    title: "Product Carbon Footprint",
    eyebrow: "Trace",
    summary: "Calculate cradle-to-gate emissions for products, components and production lines with transparent allocation rules.",
    description: "Create product-level carbon models from material, energy, logistics and production data. Every result retains its assumptions, allocation basis and source evidence for buyer, OEM and assurance review.",
    highlights: ["Cradle-to-gate modelling", "Production allocation", "Supplier data requests", "Product comparison"],
    challenges: ["Missing supplier factors", "Unclear allocation rules", "Changing product bills of material", "Buyer-specific disclosure formats"],
    methodology: ["Define functional unit and system boundary", "Map material and process flows", "Collect primary and secondary data", "Apply allocation and cut-off rules", "Run sensitivity and data-quality review"],
    deliverables: ["Product footprint model", "Data-quality assessment", "Assumption register", "Buyer-ready summary", "Improvement hotspot analysis"],
    frameworks: ["ISO 14067 aligned methodology", "GHG Protocol Product Standard", "ISO 14040/44 LCA principles"],
    timeline: "Typical pilot: 4-10 weeks for one representative product family.",
    related: ["lifecycle-assessment", "supplier-emission-estimator", "carbon-intensity-benchmark"],
  },
  {
    slug: "esg-brsr-reporting",
    title: "ESG and BRSR Reporting",
    eyebrow: "Report",
    summary: "Coordinate disclosures, evidence, ownership and review across environmental, social and governance teams.",
    description: "A structured workspace for collecting responses, assigning owners, linking evidence and producing review-ready disclosures. The platform supports reporting preparation; final regulatory interpretation remains with the organisation and its advisers.",
    highlights: ["Question-level ownership", "Evidence linking", "Readiness scoring", "Reviewer workflow"],
    challenges: ["Late cross-functional inputs", "Evidence stored outside the report", "Inconsistent answers across questionnaires", "Limited management visibility"],
    methodology: ["Select applicable framework", "Map disclosures to owners and evidence", "Complete gap assessment", "Review calculation-backed answers", "Export a controlled reporting pack"],
    deliverables: ["Disclosure tracker", "Evidence index", "Gap and action register", "Review pack", "Board-ready summary"],
    frameworks: ["SEBI BRSR and BRSR Core", "GRI references", "ISSB IFRS S1/S2 references", "CDP-aligned data preparation"],
    timeline: "Typical readiness programme: 6-12 weeks.",
    related: ["esg-readiness-assessment", "brsr-readiness-checker", "ai-reporting-assistant"],
  },
  {
    slug: "energy-resource-management",
    title: "Energy and Resource Management",
    eyebrow: "Improve",
    summary: "Connect energy, water, waste and production data to identify operational efficiency opportunities.",
    description: "Track consumption and intensity at facility and source level, compare periods, and convert validated opportunities into owned improvement projects.",
    highlights: ["Energy and production ledgers", "Intensity trends", "Facility benchmarking", "Opportunity-to-project workflow"],
    challenges: ["Utility data without production context", "No common unit registry", "Savings not tied to baselines", "Projects separated from the inventory"],
    methodology: ["Establish baselines", "Normalise units and production", "Identify significant users", "Model reduction scenarios", "Track implementation and verified outcomes"],
    deliverables: ["Resource baseline", "Hotspot register", "Prioritised opportunity pipeline", "Scenario model", "Performance dashboard"],
    frameworks: ["ISO 50001 principles", "GHG Protocol", "Measurement and verification good practice"],
    timeline: "Typical facility baseline: 2-6 weeks.",
    related: ["energy-savings-calculator", "renewable-energy-planner", "decarbonization-scenario-tool"],
  },
  {
    slug: "supplier-intelligence",
    title: "Supplier Sustainability Intelligence",
    eyebrow: "Engage",
    summary: "Collect, assess and improve supplier carbon and ESG data without losing response lineage.",
    description: "Create supplier questionnaires, request evidence, score data confidence and identify value-chain hotspots. Responses remain reviewable before they affect Scope 3 estimates or customer disclosures.",
    highlights: ["Supplier questionnaires", "Evidence requests", "Confidence scoring", "Scope 3 preparation"],
    challenges: ["Low response rates", "Non-comparable supplier answers", "Estimated data presented as primary data", "Repeated OEM requests"],
    methodology: ["Segment suppliers by spend and risk", "Issue proportionate requests", "Validate evidence and units", "Estimate gaps transparently", "Prioritise engagement"],
    deliverables: ["Supplier response register", "Data confidence map", "Engagement pipeline", "Category hotspot view", "Customer-ready evidence pack"],
    frameworks: ["GHG Protocol Scope 3 Standard", "CDP Supply Chain references", "EcoVadis evidence preparation"],
    timeline: "Typical supplier pilot: 8-14 weeks.",
    related: ["supplier-emission-estimator", "supplier-risk-scanner", "ai-document-extraction"],
  },
  {
    slug: "net-zero-strategy",
    title: "Net-Zero Strategy and Transition Planning",
    eyebrow: "Act",
    summary: "Turn a verified baseline into prioritised initiatives, scenarios, targets and an accountable delivery roadmap.",
    description: "Model reduction levers against the organisation's actual inventory, compare cost and impact assumptions, and track approved initiatives through implementation.",
    highlights: ["Baseline-linked scenarios", "Marginal abatement view", "Target pathways", "Project governance"],
    challenges: ["Targets disconnected from operations", "Unreviewed savings claims", "No project ownership", "Capital plans without carbon impact"],
    methodology: ["Validate baseline and forecast", "Define target boundary", "Model technical levers", "Prioritise by impact, cost and feasibility", "Govern delivery and reforecast"],
    deliverables: ["Transition pathway", "Initiative portfolio", "Scenario assumptions", "Target dashboard", "Governance cadence"],
    frameworks: ["SBTi-aligned planning concepts", "GHG Protocol", "IFRS S2 transition plan references"],
    timeline: "Typical strategy engagement: 8-16 weeks.",
    related: ["decarbonization-scenario-tool", "renewable-energy-planner", "ai-recommendation-engine"],
  },
  {
    slug: "lifecycle-assessment",
    title: "Life Cycle Assessment",
    eyebrow: "Understand",
    summary: "Evaluate environmental impacts across a product system using explicit boundaries, datasets and assumptions.",
    description: "Structured LCA support for manufacturers that need deeper product impact analysis than a carbon-only footprint. Models are designed for transparent review, not black-box claims.",
    highlights: ["Goal and scope definition", "Inventory modelling", "Impact interpretation", "Sensitivity analysis"],
    methodology: ["Define goal, audience and functional unit", "Build the life-cycle inventory", "Select impact methods", "Interpret contribution and uncertainty", "Complete critical review where required"],
    deliverables: ["LCA model", "Inventory register", "Impact results", "Sensitivity assessment", "Interpretation report"],
    frameworks: ["ISO 14040", "ISO 14044", "ISO 14067 where carbon-specific"],
    timeline: "Typical screening LCA: 6-12 weeks; comparative assertions may require independent critical review.",
    related: ["product-carbon-footprint", "carbon-intensity-benchmark", "ai-carbon-forecasting"],
  },
  {
    slug: "data-integration",
    title: "Carbon Data Integration",
    eyebrow: "Connect",
    summary: "Move operational data from files and business systems into a governed validation and staging pipeline.",
    description: "Map incoming data, test quality, detect duplicates and approve records before posting them to operational ledgers. API and connector availability depends on the selected plan and source-system access.",
    highlights: ["CSV and Excel ingestion", "Mapping and validation", "Governed staging ledger", "API-ready architecture"],
    challenges: ["Changing spreadsheet formats", "Untraceable manual edits", "Duplicate imports", "Direct posting without review"],
    methodology: ["Profile source data", "Define mapping contract", "Validate units and references", "Stage and approve records", "Monitor pipeline quality"],
    deliverables: ["Source mapping", "Validation rules", "Exception workflow", "Pipeline audit log", "Integration runbook"],
    frameworks: ["SOC 2 control concepts", "ISO 27001 control concepts", "Tenant-isolated data handling"],
    timeline: "CSV onboarding can begin immediately; source-system integrations are scoped individually.",
    related: ["ai-document-extraction", "emission-factor-database", "ghg-accounting"],
  },
];

export const industryContent: PublicContentItem[] = [
  ["cement", "Cement and Building Materials", "Calcination, kiln fuel and clinker ratio create a concentrated decarbonisation challenge.", ["Process emissions", "Alternative fuels", "Clinker substitution", "CBAM exposure"]],
  ["steel", "Iron, Steel and Foundries", "Combustion, purchased electricity and material yield drive cost and carbon intensity.", ["Furnace energy", "Scrap quality", "Yield loss", "Buyer PCF requests"]],
  ["textiles", "Textiles and Apparel", "Wet processing, steam, chemicals and supplier networks require facility and value-chain visibility.", ["Steam systems", "Water intensity", "Chemical evidence", "Brand questionnaires"]],
  ["automotive", "Automotive and Components", "OEM programmes increasingly require product footprints, renewable energy and traceable supplier data.", ["OEM disclosures", "Product footprints", "Supplier evidence", "Renewable sourcing"]],
  ["chemicals", "Chemicals and Specialty Materials", "Process energy, fugitive emissions and complex product systems demand rigorous source mapping.", ["Reaction emissions", "Solvent losses", "Steam and heat", "Product allocation"]],
  ["pharmaceuticals", "Pharmaceuticals", "Batch operations, clean utilities and regulated documentation create a distinct carbon data environment.", ["HVAC and cleanrooms", "Boiler fuel", "Batch allocation", "Audit evidence"]],
  ["food-processing", "Food and Beverage", "Cold chains, thermal processing, refrigeration and agricultural inputs shape the footprint.", ["Refrigerants", "Thermal energy", "Food loss", "Value-chain emissions"]],
  ["paper-packaging", "Paper and Packaging", "Fibre, recycled content, process heat and end-of-life claims require balanced impact analysis.", ["Process steam", "Recycled content", "Water", "EPR data"]],
  ["electronics", "Electronics and Electrical Equipment", "Purchased goods, electricity and product-level customer requests dominate reporting needs.", ["Supplier data", "Grid electricity", "Product PCF", "Export requirements"]],
  ["plastics", "Plastics and Polymers", "Feedstock choice, extrusion energy and circularity claims require transparent boundaries.", ["Resin footprint", "Process energy", "Recycled feedstock", "EPR reporting"]],
  ["mining", "Mining and Minerals", "Mobile combustion, purchased electricity and land impacts require site-level control.", ["Haulage fuel", "Beneficiation energy", "Methane where applicable", "Rehabilitation data"]],
  ["logistics", "Logistics and Warehousing", "Fleet fuels, outsourced transport and warehouse energy need consistent distance and load data.", ["Fleet fuel", "Carrier data", "Load factors", "Warehouse energy"]],
  ["energy", "Energy and Utilities", "Generation mix, losses, methane and customer reporting create complex inventories.", ["Generation factors", "Transmission losses", "Methane", "Renewable attributes"]],
  ["real-estate", "Real Estate and Infrastructure", "Construction materials and operational energy connect embodied and use-phase carbon decisions.", ["Embodied carbon", "Building energy", "Refrigerants", "Asset benchmarking"]],
].map(([slug, title, summary, highlights]) => ({
  slug: slug as string,
  title: title as string,
  eyebrow: "Industry solution",
  summary: summary as string,
  description: `Balancing Carbon gives ${String(title).toLowerCase()} teams a governed way to collect activity data, apply appropriate factors, connect evidence and prioritise practical reduction work. The configuration is adapted to the organisation's boundary, geography and reporting obligations.`,
  highlights: highlights as string[],
  challenges: highlights as string[],
  methodology: ["Confirm facilities, processes and reporting boundary", "Map significant sources and applicable requirements", "Configure units, factors and evidence rules", "Build the baseline and identify data gaps", "Prioritise operational and supplier actions"],
  deliverables: ["Industry-specific source map", "Facility data template", "Carbon baseline", "Readiness and gap register", "Prioritised action roadmap"],
  frameworks: ["GHG Protocol", "ISO 14064-1 aligned workflow", "Applicable national and customer requirements"],
  timeline: "A representative facility can usually be configured in 2-6 weeks, subject to data availability.",
}));

export const aiContent: PublicContentItem[] = [
  ["ai-carbon-assistant", "AI Carbon Assistant", "Ask grounded questions about recorded emissions, facilities, evidence, reports and reduction projects.", ["Approved tenant data", "Calculation metadata", "Evidence references"], ["Cited response", "Suggested review steps", "Source links"]],
  ["ai-emission-calculator", "AI Emission Calculator", "Guide users to the correct activity type, unit and factor while keeping calculations deterministic.", ["Activity description", "Quantity and unit", "Location and period"], ["Mapped source", "Deterministic result", "Assumption warnings"]],
  ["ai-reporting-assistant", "AI Reporting Assistant", "Draft disclosure language from approved platform data for human review.", ["Approved metrics", "Framework question", "Evidence index"], ["Draft response", "Citations", "Missing-data flags"]],
  ["ai-document-extraction", "AI Document Extraction", "Extract candidate values from bills, invoices and reports before validation and posting.", ["Uploaded document", "Document category", "Organisation context"], ["Candidate fields", "Confidence scores", "Review queue"]],
  ["ai-compliance-monitoring", "AI Compliance Monitoring", "Track mapped obligations and highlight changes that may affect the reporting programme.", ["Applicable frameworks", "Organisation profile", "Review calendar"], ["Change summary", "Impact questions", "Owner tasks"]],
  ["ai-carbon-forecasting", "AI Carbon Forecasting", "Combine approved baselines and user-supplied assumptions to explore future emissions ranges.", ["Historic inventory", "Production forecast", "Energy assumptions"], ["Forecast range", "Driver analysis", "Uncertainty notes"]],
  ["ai-scenario-analysis", "AI Scenario Analysis", "Compare decarbonisation levers and explain the operational assumptions behind each scenario.", ["Baseline", "Reduction levers", "Cost assumptions"], ["Scenario comparison", "Impact estimate", "Engineering review flags"]],
  ["ai-recommendation-engine", "AI Recommendation Engine", "Prioritise evidence-backed opportunities without presenting advisory output as engineering approval.", ["Hotspots", "Facility profile", "Project history"], ["Ranked opportunities", "Rationale", "Validation checklist"]],
].map(([slug, title, summary, inputs, outputs]) => ({
  slug: slug as string,
  title: title as string,
  eyebrow: "Human-reviewed AI",
  summary: summary as string,
  description: "This capability is designed as a governed copilot. It can retrieve, structure and explain information, but it cannot approve ledger records, replace professional judgement or make unsupported compliance claims.",
  highlights: [...(inputs as string[]).map((item) => `Input: ${item}`), ...(outputs as string[]).map((item) => `Output: ${item}`)],
  challenges: ["Hallucination risk is controlled through retrieval and citations", "Low-confidence outputs are surfaced for review", "Tenant context remains isolated", "Ledger writes require explicit user action"],
  methodology: ["Retrieve only authorised organisation context", "Separate deterministic calculations from generated language", "Return sources and confidence signals", "Require human review before operational use", "Log model and prompt metadata where enabled"],
  deliverables: outputs as string[],
  frameworks: ["Human-in-the-loop governance", "Tenant-isolated retrieval", "No autonomous ledger writes", "Model availability depends on deployment configuration"],
  timeline: "Available after workspace configuration and data-permission review.",
}));

export const toolContent: PublicContentItem[] = [
  ["scope-1-2-calculator", "Scope 1 and 2 Calculator", "Fuel, refrigerant and electricity activity", "Scope totals with factor references"],
  ["scope-3-estimator", "Scope 3 Estimator", "Spend, quantity and supplier activity", "Category estimate with confidence"],
  ["carbon-intensity-benchmark", "Carbon Intensity Benchmark", "Emissions and production output", "Comparable intensity indicators"],
  ["emission-factor-database", "Emission Factor Database", "Source, geography, year and unit", "Versioned factor candidates"],
  ["carbon-report-generator", "Carbon Report Generator", "Approved inventory and reporting period", "Review-ready carbon report"],
  ["esg-readiness-assessment", "ESG Readiness Assessment", "Governance, data and evidence responses", "Readiness gaps and actions"],
  ["brsr-readiness-checker", "BRSR Readiness Checker", "Disclosure ownership and evidence status", "BRSR preparation tracker"],
  ["supplier-emission-estimator", "Supplier Emission Estimator", "Supplier activity or spend data", "Transparent supplier estimate"],
  ["energy-savings-calculator", "Energy Savings Calculator", "Baseline use and reduction assumption", "Energy, cost and carbon estimate"],
  ["renewable-energy-planner", "Renewable Energy Planner", "Load, tariff and sourcing assumptions", "Renewable share scenarios"],
  ["decarbonization-scenario-tool", "Decarbonisation Scenario Tool", "Baseline and selected reduction levers", "Scenario impact comparison"],
].map(([slug, title, input, output]) => ({
  slug,
  title,
  eyebrow: "Interactive tool",
  summary: `${input} converted into ${String(output).toLowerCase()} through a transparent, reviewable workflow.`,
  description: "Use this guided tool for an initial estimate or structured data entry. Results depend on the completeness, period, geography and units of the supplied data and should be reviewed before external use.",
  highlights: [`Input: ${input}`, `Result: ${output}`, "Visible assumptions", "Export or continue in workspace"],
  methodology: ["Select boundary and reporting period", "Enter or import activity data", "Validate units and source mapping", "Review factors and assumptions", "Generate result and next-step checklist"],
  deliverables: [String(output), "Assumption summary", "Data-quality warnings", "Recommended next step"],
  frameworks: ["GHG Protocol calculation principles", "Versioned factor references", "Human review before disclosure"],
  related: ["ghg-accounting", "ai-emission-calculator"],
}));

export const insightContent: PublicContentItem[] = [
  ["scope-1-2-3-explained", "Scope 1, 2 and 3 Emissions Explained", "A practical guide to organisational emission scopes, boundaries and common data sources."],
  ["carbon-accounting-for-indian-businesses", "Carbon Accounting for Indian Businesses", "How manufacturers can build a reliable inventory without creating another spreadsheet burden."],
  ["brsr-reporting-guide", "BRSR Reporting Guide", "A preparation guide for ownership, evidence and calculation-backed disclosures."],
  ["carbon-footprint-calculation", "How to Calculate a Carbon Footprint", "A transparent five-step process from boundary selection to quality review."],
  ["supplier-carbon-accounting", "Supplier Carbon Accounting", "Collect better value-chain data while keeping estimates and primary data distinct."],
  ["esg-reporting-guide", "ESG Reporting Guide", "Structure material topics, owners, metrics, evidence and review."],
  ["carbon-accounting-software", "Carbon Accounting Software", "What enterprise buyers should evaluate beyond dashboards and visual polish."],
  ["net-zero-strategy-guide", "Net-Zero Strategy Guide", "Turn targets into an investable, governed portfolio of operational initiatives."],
  ["emission-factors-guide", "Emission Factors Guide", "Understand geography, year, units, source hierarchy and version control."],
  ["product-carbon-footprint-guide", "Product Carbon Footprint Guide", "Define functional units, boundaries, allocation and data quality for product footprints."],
  ["carbon-neutral-vs-net-zero", "Carbon Neutral vs Net Zero", "Separate offset claims from long-term value-chain decarbonisation."],
  ["ai-in-carbon-accounting", "AI in Carbon Accounting", "Where AI helps, where deterministic calculations remain essential, and how to govern both."],
  ["carbon-compliance-frameworks", "Carbon Compliance Frameworks", "A navigational overview of GHG Protocol, ISO, BRSR, CDP, ISSB and related references."],
].map(([slug, title, summary]) => ({
  slug,
  title,
  eyebrow: "Practical guide",
  summary,
  description: `${summary} This guide is written for sustainability, operations, finance and assurance teams that need a shared, defensible process.`,
  highlights: ["Plain-language concepts", "Implementation checklist", "Common control gaps", "Platform workflow example"],
  methodology: ["Start with the reporting decision", "Define accountable owners", "Collect source evidence", "Separate estimates from verified data", "Review and improve each cycle"],
  deliverables: ["Key definitions", "Practical checklist", "Risk and control notes", "Recommended next action"],
  frameworks: ["Educational content only", "Verify framework applicability with qualified advisers"],
  seoTitle: `${title} | Balancing Carbon`,
  seoDescription: summary,
}));

export const caseStudyContent: PublicContentItem[] = [
  {
    slug: "multi-site-manufacturer",
    title: "Multi-site manufacturer builds one governed carbon baseline",
    eyebrow: "Illustrative case study",
    summary: "A representative six-facility manufacturer replaces fragmented monthly spreadsheets with an evidence-linked inventory.",
    description: "This scenario is illustrative and does not represent a named client. It demonstrates how facility data, factors, review tasks and evidence can operate in one workflow.",
    highlights: ["6 representative facilities", "Scope 1 and 2 baseline", "Monthly exception review", "Management-ready reporting pack"],
    methodology: ["Mapped source templates", "Normalised units", "Assigned data owners", "Introduced approval workflow", "Locked reporting periods"],
    deliverables: ["Facility inventory", "Data-quality dashboard", "Evidence index", "Reduction opportunity register"],
    status: "Illustrative example - replace with verified client story before publication.",
  },
  {
    slug: "automotive-supplier-pcf",
    title: "Automotive supplier prepares product footprints for OEM requests",
    eyebrow: "Illustrative case study",
    summary: "A representative component supplier standardises product boundaries, energy allocation and supporting evidence.",
    description: "This is a professional placeholder showing the intended case-study structure. No customer result is claimed.",
    highlights: ["Product family pilot", "Allocation register", "Supplier data requests", "Buyer-ready summary"],
    methodology: ["Selected functional unit", "Mapped material and process flows", "Applied transparent allocation", "Reviewed uncertainty"],
    deliverables: ["PCF model", "Assumption register", "Data gap plan", "OEM response pack"],
    status: "Illustrative example - replace with verified client story before publication.",
  },
  {
    slug: "supplier-data-programme",
    title: "Enterprise launches a governed supplier data programme",
    eyebrow: "Illustrative case study",
    summary: "A representative enterprise segments suppliers and introduces proportionate carbon evidence requests.",
    description: "This scenario demonstrates the supplier intelligence workflow and is not a verified client claim.",
    highlights: ["Risk-based segmentation", "Evidence requests", "Confidence scoring", "Engagement actions"],
    methodology: ["Prioritised suppliers", "Issued tailored questionnaire", "Validated evidence", "Estimated gaps transparently", "Tracked improvement"],
    deliverables: ["Supplier register", "Data confidence map", "Scope 3 input pack", "Engagement dashboard"],
    status: "Illustrative example - replace with verified client story before publication.",
  },
];

export const contentByKind: Record<PublicContentKind, PublicContentItem[]> = {
  service: serviceContent,
  industry: industryContent,
  ai: aiContent,
  tool: toolContent,
  insight: insightContent,
  "case-study": caseStudyContent,
};

export function findPublicContent(kind: PublicContentKind, slug: string) {
  return contentByKind[kind].find((item) => item.slug === slug);
}
