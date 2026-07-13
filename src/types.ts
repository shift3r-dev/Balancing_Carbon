export interface User {
  id: string; name: string; email: string; role: string; organisationId: string;
}
export interface Organisation {
  id: string; name: string; industry: string; location: string; employeeCount: number;
  reportingYear: string; targetReductionPercent: number;
}
export type ESGReadinessStatus = 'Excellent' | 'Good' | 'Needs Improvement' | 'Critical' | 'Not Assessed';
export interface Facility {
  id: string; organisationId: string; name: string; location: string; industryType: string;
  productionOutput: number; productionUnit: string; reportingPeriod: string;
  electricityConsumption: number; fuelConsumption: number; fuelType: string;
  renewableEnergyUsage: number; emissionsScope1: number; emissionsScope2: number;
  carbonIntensity: number; esgReadinessStatus: ESGReadinessStatus;
}
export interface EnergyRecord {
  id: string; organisationId: string; facilityId: string; date: string; reportingPeriod: string;
  activityType: 'electricity' | 'fuel' | 'renewable-electricity' | 'steam' | 'heat' | 'other';
  sourceType: string;
  energyType: string;
  quantity: number; unit: string; scope: 'scope-1' | 'scope-2';
  inputQuantity?: number; inputUnit?: string; canonicalQuantity?: number; canonicalUnit?: string; conversionFactor?: number; conversionPath?: string[];
  displayValue?: number; displayUnit?: string;
  emissionFactorId: string; emissionFactorValue: number; emissionFactorUnit: string;
  emissionsKgCO2e: number; emissionsTCO2e: number;
  sourceDocument: string; notes: string; emissions: number;
  auditTrail: {
    emissionFactor?: number; emissionFactorId?: string; factorUnit?: string; factorSource?: string;
    methodology?: string; calculatedAt?: string; factorVersion?: string; emissionsKgCO2e?: number; emissionsTCO2e?: number;
  };
}
export interface ProductionRecord {
  id: string; organisationId: string; facilityId: string; date: string; reportingPeriod: string;
  quantity: number; unit: string; sourceDocument: string; notes: string;
  inputQuantity?: number; inputUnit?: string; canonicalQuantity?: number; canonicalUnit?: string; conversionFactor?: number; conversionPath?: string[];
}
export interface DiagnosticQuestionResponse {
  id: string; organisationId: string; facilityId: string; questionId: string; industry: string;
  category: string; questionText: string; answerType: 'yes-no' | 'select' | 'number' | 'text';
  answer: string; evidenceReference: string; updatedAt: string;
}
export interface DiagnosticFinding {
  id: string; organisationId?: string; facilityId?: string; category: string;
  findingType: 'fact' | 'observation' | 'questionnaire' | 'investigation-area' | 'data-gap';
  severity: 'info' | 'low' | 'medium' | 'high'; title: string; description: string;
  metricName?: string; currentValue?: number; previousValue?: number; unit?: string;
  evidence?: Record<string, any>; calculationMetadata?: Record<string, any>; generatedAt: string;
}
export interface DataCompletenessResult {
  activityCoveragePercent: number; productionCoveragePercent: number; questionnaireCompletionPercent: number; warnings: string[];
}
export interface MonthComparison {
  currentMonth: string; previousMonth: string; currentElectricityKWh: number; previousElectricityKWh: number;
  currentProductionTonnes: number | null; previousProductionTonnes: number | null;
  electricityChangePercent: number; productionChangePercent: number | null;
  currentElectricityIntensity: number | null; previousElectricityIntensity: number | null;
  electricityIntensityChangePercent: number | null; warnings: string[];
}
export interface ReductionOpportunity {
  id: string; organisationId: string; facilityId: string; diagnosticFindingId?: string;
  title: string; category: string; source: 'diagnostic' | 'hotspot' | 'manual' | 'scenario';
  description: string; rationale: string;
  status: 'identified' | 'under-review' | 'approved' | 'rejected' | 'converted-to-project';
  confidence: 'low' | 'medium' | 'high'; engineeringAssessmentRequired: boolean;
  estimatedAnnualReductionTCO2e?: number; estimatedAnnualEnergySavings?: number; energySavingsUnit?: string;
  estimatedCapex?: number; estimatedAnnualCostSavings?: number; simplePaybackYears?: number;
  calculationMetadata?: Record<string, any>; createdAt: string; updatedAt: string;
}
export interface ReductionScenario {
  id: string; organisationId: string; facilityId: string; title: string;
  baselineStartDate: string; baselineEndDate: string;
  scenarioType: 'grid-electricity-reduction' | 'diesel-reduction' | 'renewable-electricity-substitution' | 'production-normalized-efficiency';
  assumptions: Record<string, any>; baselineEmissionsTCO2e: number; scenarioEmissionsTCO2e: number;
  estimatedReductionTCO2e: number; estimatedReductionPercent: number; calculationMetadata: Record<string, any>; createdAt: string;
}
export interface DecarbonizationProject {
  id: string; organisationId: string; facilityId: string; opportunityId?: string; scenarioId?: string;
  title: string; description: string; category: string;
  status: 'planned' | 'approved' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled';
  owner: string; baselineStartDate: string; baselineEndDate: string; plannedStartDate: string; plannedCompletionDate: string;
  actualStartDate: string; actualCompletionDate: string; targetAnnualReductionTCO2e?: number;
  estimatedCapex?: number; estimatedAnnualCostSavings?: number; createdAt: string; updatedAt: string;
  milestones?: ProjectMilestone[]; measurements?: ProjectMeasurement[];
}
export interface ProjectMilestone {
  id: string; projectId: string; title: string; description: string; dueDate: string; completedAt: string; status: 'pending' | 'in-progress' | 'completed' | 'blocked';
}
export interface ProjectMeasurement {
  id: string; projectId: string; measurementStartDate: string; measurementEndDate: string;
  expectedReductionPercent: number; baselineIntensity: number; observedIntensity: number;
  observedImprovementPercent: number; variancePercentagePoints: number; methodology: string; calculationMetadata: Record<string, any>;
}
export interface ESGQuestion {
  id: string; category: 'Environmental' | 'Social' | 'Governance' | 'Energy' | 'Carbon' | 'Compliance' | 'Supplier Readiness';
  question: string; answer: string; evidence: string; score: number;
  status: 'Compliant' | 'Partial' | 'Non-Compliant' | 'Not Applicable';
  recommendation: string; assignedUser: string; reviewStatus: 'Approved' | 'In Review' | 'Draft' | 'Missing Evidence';
}
export interface OEMQuestion {
  id: string; question: string; category: string; suggestedAnswer: string; evidenceSource: string;
  confidence: 'High' | 'Medium' | 'Low'; status: 'Approved' | 'Ready for Review' | 'Flagged' | 'Draft';
}
export interface OEMQuestionnaire {
  id: string; organisationId: string; title: string; oemName: string; dueDate: string;
  status: 'Completed' | 'In Progress' | 'Not Started'; questions: OEMQuestion[];
}
export interface Document {
  id: string; organisationId: string; name: string;
  category: 'Electricity Bill' | 'Fuel Invoice' | 'Carbon Report' | 'ESG Policy' | 'Environmental Certification' | 'Energy Audit' | 'OEM Questionnaire' | 'Compliance Evidence' | 'Production Record' | 'Other';
  uploadDate: string; facilityId: string; period: string; size: string;
  aiStatus: 'Processed' | 'Processing' | 'Failed'; evidenceUsage: string;
  storagePath?: string; mimeType?: string; byteSize?: number; sha256?: string;
  extractionStatus?: 'not-requested' | 'processing' | 'completed' | 'empty' | 'failed' | 'unsupported'; extractionError?: string; extractedAt?: string;
}
export interface Report {
  id: string; organisationId: string; title: string;
  type: 'Carbon Footprint' | 'ESG Readiness' | 'Executive Summary' | 'Facility Performance';
  period: string; createdDate: string; summary: string; status: 'Generated' | 'Draft'; downloadUrl: string;
}
export enum IndustrySector {
  HEAVY_INDUSTRIES = "Heavy Industries & Materials",
  CHEMICALS = "Chemicals & Process Industries",
  TEXTILES = "Textiles, Apparel & Leather",
  MANUFACTURING = "Manufacturing, Engineering & Capital Goods",
  FOOD_AGRO = "Food, Beverages & Agro-Processing",
  PAPER_PACKAGING = "Paper, Plastics & Packaging",
  ENERGY_INFRA = "Energy, Utilities & Infrastructure",
  SERVICES_LOGISTICS = "Services, Logistics & Technology"
}
export interface IndustryProfile {
  id: string;
  name: string;
  sector: IndustrySector;
  relevance: "HIGH" | "MEDIUM" | "LOW";
  estMSMEs: string;
  majorStates: string[];
  typicalSize: string;
  decisionMaker: string;
  urgencyPoints: string[];
  standards: {
    protocol: string;
    service: string;
    benefit: string;
    urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  }[];
}
export interface MockCertificate {
  certificateNo: string;
  companyName: string;
  industry: string;
  sector: IndustrySector;
  issueDate: string;
  expiryDate: string;
  level: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
  scope1: number;
  scope2: number;
  scope3: number;
  intensityMetric: string;
  intensityValue: number;
  offsetSerialNumbers: string[];
  blockchainHash: string;
  verifiedBy: string;
  status: "Active" | "Pending" | "Expired" | "Revoked";
  documents: {
    name: string;
    type: string;
    uploadDate: string;
    verificationStatus: "Verified" | "Flagged";
    confidenceScore: number;
  }[];
}
export interface AIMessage { id: string; sender: 'user' | 'ai'; text: string; timestamp: string; sources?: { title: string; type: string; confidence?: string }[]; }
export interface AIConversation { id: string; organisationId: string; title: string; lastUpdated: string; messages: AIMessage[]; }
export interface AuditLog { id: string; organisationId: string; userId: string; userEmail: string; action: string; details: string; timestamp: string; }
export type ViewState =
  | 'home' | 'services' | 'industries' | 'carbon-intelligence' | 'esg-readiness' | 'about' | 'resources' | 'contact' | 'pricing'
  | 'assessment' | 'login' | 'public-calculator' | 'dashboard-overview' | 'dashboard-company' | 'dashboard-facilities'
  | 'dashboard-energy' | 'dashboard-emissions-scope1' | 'dashboard-emissions-scope2' | 'dashboard-emissions-scope3'
  | 'dashboard-calculator' | 'dashboard-intelligence' | 'dashboard-opportunities' | 'dashboard-scenarios' | 'dashboard-projects'
  | 'dashboard-esg' | 'dashboard-questionnaires' | 'dashboard-documents' | 'dashboard-reports'
  | 'dashboard-ai-assistant' | 'dashboard-settings' | 'dashboard-metadata' | 'dashboard-data-platform' | 'dashboard-collaboration' | 'dashboard-public-portal' | 'dashboard-help' | 'dashboard-analytics' | 'dashboard-sustainability';
