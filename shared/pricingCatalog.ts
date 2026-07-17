export type BillingInterval = 'monthly' | 'yearly';
export type PricingAvailability = 'included' | 'not-included' | 'custom' | 'coming-soon';

export interface PricingFeature {
  key: string;
  label: string;
  category: string;
  availability: PricingAvailability;
}

export interface PricingLimit {
  key: string;
  type: 'number' | 'unlimited' | 'custom';
  value: number | null;
  displayValue: string;
  unit: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  valueProposition: string;
  targetAudience: string[];
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  trialDays: number;
  recommended: boolean;
  badge: string;
  ctaLabel: string;
  ctaAction: 'register' | 'demo' | 'sales';
  contactSales: boolean;
  promotion: { label?: string; annualSavingsPercent?: number };
  active: boolean;
  visible: boolean;
  sortOrder: number;
  features: PricingFeature[];
  limits: PricingLimit[];
}

export interface PricingAddon {
  id: string;
  key: string;
  name: string;
  description: string;
  benefit: string;
  pricingLabel: string;
  category: string;
  visible: boolean;
  sortOrder: number;
}

export interface ImplementationService {
  id: string;
  key: string;
  name: string;
  description: string;
  pricingLabel: string;
  visible: boolean;
  sortOrder: number;
}

const featureRows = [
  ['scope_1', 'Scope 1', 'Carbon accounting'], ['scope_2', 'Scope 2', 'Carbon accounting'], ['scope_3', 'Scope 3', 'Carbon accounting'],
  ['ai_copilot', 'AI Carbon Copilot', 'AI and automation'], ['ai_ocr', 'AI OCR', 'AI and automation'],
  ['brsr', 'BRSR', 'Reporting'], ['gri', 'GRI', 'Reporting'], ['cbam', 'CBAM', 'Reporting'], ['ifrs', 'IFRS S2', 'Reporting'], ['csrd', 'CSRD', 'Reporting'],
  ['supplier_portal', 'Supplier Portal', 'Value chain'], ['api', 'API Access', 'Integrations'], ['erp', 'ERP Imports', 'Integrations'], ['sap', 'SAP Integration', 'Integrations'], ['iot', 'IoT and Smart Meters', 'Integrations'],
  ['audit_trail', 'Audit Trail', 'Governance'], ['reports', 'Reports', 'Governance'], ['dashboards', 'Dashboards', 'Governance'], ['storage', 'Storage', 'Platform'], ['support', 'Support', 'Platform'],
  ['sso', 'SSO', 'Security'], ['security', 'Security Review', 'Security'], ['custom_ai', 'Custom AI Models', 'AI and automation'],
] as const;

function features(included: string[], custom: string[] = [], comingSoon: string[] = []): PricingFeature[] {
  return featureRows.map(([key, label, category]) => ({ key, label, category, availability: custom.includes(key) ? 'custom' : comingSoon.includes(key) ? 'coming-soon' : included.includes(key) ? 'included' : 'not-included' }));
}

const limit = (key: string, type: PricingLimit['type'], value: number | null, displayValue: string, unit: string): PricingLimit => ({ key, type, value, displayValue, unit });

export const defaultPricingPlans: PricingPlan[] = [
  {
    id: 'plan-free', name: 'Free', slug: 'free', description: 'A governed starting point for learning, evaluation and early carbon measurement.', valueProposition: 'Build your first facility inventory without a time-limited trial.', targetAudience: ['Students', 'Startups', 'Learning teams', 'Evaluation'], monthlyPrice: 0, yearlyPrice: 0, currency: 'INR', trialDays: 0, recommended: false, badge: 'Free forever', ctaLabel: 'Start Free', ctaAction: 'register', contactSales: false, promotion: {}, active: true, visible: true, sortOrder: 1,
    features: features(['scope_1', 'scope_2', 'reports', 'dashboards', 'storage', 'support']),
    limits: [limit('facilities', 'number', 1, '1', 'facility'), limit('team_members', 'number', 1, '1', 'member'), limit('ocr_pages_month', 'number', 50, '50', 'pages/month'), limit('ai_reports_month', 'number', 2, '2', 'reports/month'), limit('storage_gb', 'number', 1, '1 GB', 'storage'), limit('api_calls_month', 'number', 0, 'Not included', 'calls/month'), limit('plants', 'number', 1, '1', 'plant')],
  },
  {
    id: 'plan-starter', name: 'Starter', slug: 'starter', description: 'Practical carbon operations for small manufacturers and growing businesses.', valueProposition: 'Move electricity bills and spreadsheets into a repeatable reporting workflow.', targetAudience: ['Small manufacturers', 'SMEs', 'Growing businesses'], monthlyPrice: 9999, yearlyPrice: 99990, currency: 'INR', trialDays: 14, recommended: false, badge: '', ctaLabel: 'Start Trial', ctaAction: 'register', contactSales: false, promotion: { annualSavingsPercent: 17 }, active: true, visible: true, sortOrder: 2,
    features: features(['scope_1', 'scope_2', 'scope_3', 'ai_ocr', 'brsr', 'reports', 'dashboards', 'storage', 'support']),
    limits: [limit('facilities', 'number', 3, '3', 'facilities'), limit('team_members', 'number', 5, '5', 'members'), limit('ocr_pages_month', 'number', 500, '500', 'pages/month'), limit('ai_reports_month', 'number', 20, '20', 'reports/month'), limit('storage_gb', 'number', 20, '20 GB', 'storage'), limit('api_calls_month', 'number', 0, 'Not included', 'calls/month'), limit('plants', 'number', 3, '3', 'plants')],
  },
  {
    id: 'plan-professional', name: 'Professional', slug: 'professional', description: 'Complete carbon intelligence for medium manufacturing companies and multi-team programmes.', valueProposition: 'Connect facilities, suppliers, approvals, reporting and AI-assisted analysis in one governed platform.', targetAudience: ['Medium manufacturers', 'Multi-facility teams', 'Sustainability leaders'], monthlyPrice: 49999, yearlyPrice: 499990, currency: 'INR', trialDays: 0, recommended: true, badge: 'Recommended', ctaLabel: 'Book Demo', ctaAction: 'demo', contactSales: false, promotion: { label: 'Most selected', annualSavingsPercent: 17 }, active: true, visible: true, sortOrder: 3,
    features: features(['scope_1', 'scope_2', 'scope_3', 'ai_copilot', 'ai_ocr', 'brsr', 'gri', 'cbam', 'supplier_portal', 'api', 'erp', 'audit_trail', 'reports', 'dashboards', 'storage', 'support']),
    limits: [limit('facilities', 'unlimited', null, 'Unlimited', 'facilities'), limit('team_members', 'number', 50, '50', 'members'), limit('ocr_pages_month', 'number', 5000, '5,000', 'pages/month'), limit('ai_reports_month', 'unlimited', null, 'Unlimited', 'reports'), limit('storage_gb', 'number', 100, '100 GB', 'storage'), limit('api_calls_month', 'number', 100000, '100,000', 'calls/month'), limit('plants', 'unlimited', null, 'Unlimited', 'plants')],
  },
  {
    id: 'plan-enterprise', name: 'Enterprise', slug: 'enterprise', description: 'A configurable operating model for complex, regulated and infrastructure-intensive enterprises.', valueProposition: 'Deploy at enterprise scale with dedicated architecture, integrations, controls and success ownership.', targetAudience: ['Steel and cement', 'Automotive and chemicals', 'Mining and energy', 'Large manufacturers'], monthlyPrice: 0, yearlyPrice: 0, currency: 'INR', trialDays: 0, recommended: false, badge: 'Custom', ctaLabel: 'Talk to Sales', ctaAction: 'sales', contactSales: true, promotion: {}, active: true, visible: true, sortOrder: 4,
    features: features(featureRows.map(([key]) => key), ['sap', 'iot', 'sso', 'security', 'custom_ai', 'ifrs', 'csrd']),
    limits: [limit('facilities', 'unlimited', null, 'Unlimited', 'facilities'), limit('team_members', 'unlimited', null, 'Unlimited', 'members'), limit('ocr_pages_month', 'unlimited', null, 'Unlimited', 'pages'), limit('ai_reports_month', 'unlimited', null, 'Unlimited', 'reports'), limit('storage_gb', 'unlimited', null, 'Unlimited', 'storage'), limit('api_calls_month', 'custom', null, 'Custom', 'calls'), limit('plants', 'unlimited', null, 'Unlimited', 'plants')],
  },
];

export const defaultPricingAddons: PricingAddon[] = [
  ['ai-copilot', 'AI Carbon Copilot', 'Grounded assistance across governed carbon data and evidence.', 'Reduce analysis and drafting time while retaining human review.', 'From custom quote', 'AI'],
  ['supplier-portal', 'Supplier Portal', 'Structured supplier data requests, assessments and evidence exchange.', 'Improve Scope 3 data coverage and supplier engagement.', 'From custom quote', 'Value chain'],
  ['cbam', 'CBAM', 'Product and installation-level embedded emissions workflows.', 'Prepare traceable export reporting and review packages.', 'Custom quote', 'Compliance'],
  ['lca', 'Life Cycle Assessment', 'Lifecycle inventory and impact modelling workspace.', 'Extend accounting into product and process decisions.', 'Custom quote', 'Product carbon'],
  ['pcf', 'Product Carbon Footprint', 'Product-level footprint calculation and evidence lineage.', 'Respond to customer and value-chain data requests.', 'Custom quote', 'Product carbon'],
  ['net-zero', 'Net Zero Planner', 'Targets, scenarios, pathways and project tracking.', 'Connect commitments to measurable operational action.', 'Custom quote', 'Planning'],
  ['marketplace', 'Carbon Credit Marketplace', 'Governed project and credit catalogue integration.', 'Support controlled evaluation without mixing offsets into inventory.', 'Custom quote', 'Marketplace'],
  ['energy', 'Energy Management', 'Energy ledgers, intensity analysis and opportunity tracking.', 'Connect energy cost and carbon performance.', 'Custom quote', 'Operations'],
  ['water', 'Water Management', 'Withdrawal, discharge, quality and stress-context ledgers.', 'Coordinate water performance and disclosures.', 'Custom quote', 'Operations'],
  ['waste', 'Waste Management', 'Waste stream, treatment and circularity tracking.', 'Improve waste evidence and Scope 3 Category 5 data.', 'Custom quote', 'Operations'],
  ['iot', 'IoT Integration', 'Smart meter, sensor and SCADA ingestion pipelines.', 'Reduce manual collection and improve data frequency.', 'Custom quote', 'Integrations'],
  ['erp', 'ERP Integration', 'Controlled imports from ERP and finance systems.', 'Connect operational and purchasing data at scale.', 'Custom quote', 'Integrations'],
  ['custom-api', 'Custom API', 'Purpose-built endpoints, schemas and workflow integration.', 'Embed carbon intelligence into existing operations.', 'Custom quote', 'Integrations'],
  ['branding', 'Custom Branding', 'Branded portals, reports and stakeholder outputs.', 'Deliver a consistent customer-facing experience.', 'Custom quote', 'Experience'],
  ['storage', 'Additional Storage', 'Additional governed document and evidence capacity.', 'Retain larger reporting and assurance archives.', 'Usage based', 'Capacity'],
  ['ai-credits', 'Additional AI Credits', 'Additional governed AI and extraction capacity.', 'Scale document and analysis workloads.', 'Usage based', 'Capacity'],
  ['consulting', 'Consulting', 'Climate, reporting and implementation advisory support.', 'Accelerate decisions and programme design.', 'Custom quote', 'Services'],
  ['training', 'Training', 'Role-based administrator and practitioner enablement.', 'Improve adoption and operating consistency.', 'Custom quote', 'Services'],
].map(([key, name, description, benefit, pricingLabel, category], index) => ({ id: `addon-${key}`, key, name, description, benefit, pricingLabel, category, visible: true, sortOrder: index + 1 }));

export const defaultImplementationServices: ImplementationService[] = [
  ['data-migration', 'Data Migration', 'Clean, map and transfer existing activity, facility and evidence records.'],
  ['erp-integration', 'ERP Integration', 'Design governed imports from finance, procurement and operations systems.'],
  ['sap-integration', 'SAP Integration', 'Map relevant SAP objects and controlled carbon data pipelines.'],
  ['inventory-setup', 'Carbon Inventory Setup', 'Establish boundaries, facilities, sources, categories and review workflows.'],
  ['factor-customization', 'Emission Factor Customization', 'Configure approved regional, supplier and organization-specific factors.'],
  ['brsr-setup', 'BRSR Setup', 'Configure indicators, evidence responsibilities and report preparation.'],
  ['training', 'Training', 'Enable administrators, contributors, reviewers and executives.'],
  ['implementation', 'Implementation', 'Plan and deliver a phased production rollout.'],
  ['net-zero-strategy', 'Net Zero Strategy', 'Develop targets, scenarios, pathways and a governed action portfolio.'],
].map(([key, name, description], index) => ({ id: `service-${key}`, key, name, description, pricingLabel: 'Custom Quote', visible: true, sortOrder: index + 1 }));
