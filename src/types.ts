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
  energyType: 'Grid Electricity' | 'Renewable Electricity' | 'Diesel' | 'Petrol' | 'LPG' | 'Natural Gas' | 'Furnace Oil' | 'Biomass';
  quantity: number; unit: string; sourceDocument: string; notes: string; emissions: number;
  auditTrail: { emissionFactor: number; factorUnit: string; factorSource: string; methodology: string; calculatedAt: string; };
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
}
export interface Report {
  id: string; organisationId: string; title: string;
  type: 'Carbon Footprint' | 'ESG Readiness' | 'Executive Summary' | 'Facility Performance';
  period: string; createdDate: string; summary: string; status: 'Generated' | 'Draft'; downloadUrl: string;
}
export interface AIMessage { id: string; sender: 'user' | 'ai'; text: string; timestamp: string; sources?: { title: string; type: string; confidence?: string }[]; }
export interface AIConversation { id: string; organisationId: string; title: string; lastUpdated: string; messages: AIMessage[]; }
export interface AuditLog { id: string; organisationId: string; userId: string; userEmail: string; action: string; details: string; timestamp: string; }
export type ViewState =
  | 'home' | 'services' | 'industries' | 'carbon-intelligence' | 'esg-readiness' | 'about' | 'resources' | 'contact'
  | 'assessment' | 'login' | 'public-calculator' | 'dashboard-overview' | 'dashboard-company' | 'dashboard-facilities'
  | 'dashboard-energy' | 'dashboard-emissions-scope1' | 'dashboard-emissions-scope2' | 'dashboard-emissions-scope3'
  | 'dashboard-esg' | 'dashboard-questionnaires' | 'dashboard-documents' | 'dashboard-reports'
  | 'dashboard-ai-assistant' | 'dashboard-settings';
