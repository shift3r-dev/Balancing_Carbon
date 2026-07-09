import fs from 'fs';
import path from 'path';

export interface Organisation {
  id: string;
  name: string;
  industry: string;
  location: string;
  employeeCount: number;
  reportingYear: string;
  targetReductionPercent: number;
}

export interface Facility {
  id: string;
  organisationId: string;
  name: string;
  location: string;
  industryType: string;
  productionOutput: number; // tonnes per year
  productionUnit: string;
  reportingPeriod: string;
  electricityConsumption: number; // kWh
  fuelConsumption: number; // Litres/kg depending on type
  fuelType: string;
  renewableEnergyUsage: number; // kWh
  emissionsScope1: number; // tCO2e
  emissionsScope2: number; // tCO2e
  carbonIntensity: number; // tCO2e / production tonne
  esgReadinessStatus: 'Excellent' | 'Good' | 'Needs Improvement' | 'Critical';
}

export interface EnergyRecord {
  id: string;
  organisationId: string;
  facilityId: string;
  date: string;
  reportingPeriod: string;
  energyType: 'Grid Electricity' | 'Renewable Electricity' | 'Diesel' | 'Petrol' | 'LPG' | 'Natural Gas' | 'Furnace Oil' | 'Biomass';
  quantity: number;
  unit: string;
  sourceDocument: string;
  notes: string;
  emissions: number; // tCO2e (calculated)
  auditTrail: {
    emissionFactor: number;
    factorUnit: string;
    factorSource: string;
    methodology: string;
    calculatedAt: string;
  };
}

export interface ESGQuestion {
  id: string;
  category: 'Environmental' | 'Social' | 'Governance' | 'Energy' | 'Carbon' | 'Compliance' | 'Supplier Readiness';
  question: string;
  answer: string;
  evidence: string;
  score: number; // 0 to 10
  status: 'Compliant' | 'Partial' | 'Non-Compliant' | 'Not Applicable';
  recommendation: string;
  assignedUser: string;
  reviewStatus: 'Approved' | 'In Review' | 'Draft' | 'Missing Evidence';
}

export interface OEMQuestionnaire {
  id: string;
  organisationId: string;
  title: string;
  oemName: string;
  dueDate: string;
  status: 'Completed' | 'In Progress' | 'Not Started';
  questions: {
    id: string;
    question: string;
    category: string;
    suggestedAnswer: string;
    evidenceSource: string;
    confidence: 'High' | 'Medium' | 'Low';
    status: 'Approved' | 'Ready for Review' | 'Flagged' | 'Draft';
  }[];
}

export interface Document {
  id: string;
  organisationId: string;
  name: string;
  category: 'Electricity Bill' | 'Fuel Invoice' | 'Carbon Report' | 'ESG Policy' | 'Environmental Certification' | 'Energy Audit' | 'OEM Questionnaire' | 'Compliance Evidence' | 'Production Record' | 'Other';
  uploadDate: string;
  facilityId: string;
  period: string;
  size: string;
  aiStatus: 'Processed' | 'Processing' | 'Failed';
  evidenceUsage: string; // which metric or assessment uses this
}

export interface Report {
  id: string;
  organisationId: string;
  title: string;
  type: 'Carbon Footprint' | 'ESG Readiness' | 'Executive Summary' | 'Facility Performance';
  period: string;
  createdDate: string;
  summary: string;
  status: 'Generated' | 'Draft';
  downloadUrl: string;
}

export interface AIMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  sources?: { title: string; type: string; confidence?: string }[];
}

export interface AIConversation {
  id: string;
  organisationId: string;
  title: string;
  lastUpdated: string;
  messages: AIMessage[];
}

export interface AuditLog {
  id: string;
  organisationId: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  organisationId: string;
}

// Global state interface
export interface DBState {
  users: AuthUser[];
  organisations: Organisation[];
  facilities: Facility[];
  energyRecords: EnergyRecord[];
  esgQuestions: Record<string, ESGQuestion[]>; // orgId -> ESGQuestion[]
  oemQuestionnaires: OEMQuestionnaire[];
  documents: Document[];
  reports: Report[];
  aiConversations: AIConversation[];
  auditLogs: AuditLog[];
}

const DB_FILE_PATH = process.env.VERCEL === '1'
  ? path.join('/tmp', 'database.json')
  : path.join(process.cwd(), 'database.json');

// Default Indian Industrial Seeding
const DEFAULT_ORG_ID = 'org-apex';
const DEFAULT_USER_EMAIL = 'singhyuvr.aj1211.gs@gmail.com';

const EMISSION_FACTORS = {
  'Grid Electricity': { factor: 0.82, unit: 'kgCO2e/kWh', source: 'CEA India Grid Emission Factor v19', methodology: 'Scope 2 Location-Based Electricity Emissions' },
  'Renewable Electricity': { factor: 0, unit: 'kgCO2e/kWh', source: 'GHG Protocol Scope 2', methodology: 'Zero Emission Renewable Procurement' },
  'Diesel': { factor: 2.68, unit: 'kgCO2e/Litre', source: 'IPCC 2006 Guidelines for Mobile/Stationary Combustion', methodology: 'Scope 1 Stationary/Mobile Combustion' },
  'Petrol': { factor: 2.31, unit: 'kgCO2e/Litre', source: 'IPCC 2006 Guidelines', methodology: 'Scope 1 Mobile Combustion' },
  'LPG': { factor: 2.98, unit: 'kgCO2e/kg', source: 'IPCC 2006 Guidelines', methodology: 'Scope 1 Combustion' },
  'Natural Gas': { factor: 2.02, unit: 'kgCO2e/m3', source: 'IPCC 2006 Guidelines', methodology: 'Scope 1 Stationary Combustion' },
  'Furnace Oil': { factor: 3.15, unit: 'kgCO2e/Litre', source: 'IPCC 2006 Guidelines', methodology: 'Scope 1 Industrial Boiler Combustion' },
  'Biomass': { factor: 0.05, unit: 'kgCO2e/kg', source: 'IPCC Net Biogenic Emissions Adjustment', methodology: 'Biogenic Emissions Component' }
};

export function calculateEmissions(type: keyof typeof EMISSION_FACTORS, quantity: number): { emissionsTonne: number; factor: number; unit: string; source: string; methodology: string } {
  const meta = EMISSION_FACTORS[type];
  if (!meta) {
    return { emissionsTonne: 0, factor: 0, unit: '', source: '', methodology: '' };
  }
  // Emissions in tonnes: (Quantity * Factor) / 1000 (since factor is in kgCO2e)
  // For electricity, kgCO2e/kWh * kWh = kgCO2e, then / 1000 = tCO2e
  const kgCO2e = quantity * meta.factor;
  const emissionsTonne = parseFloat((kgCO2e / 1000).toFixed(4));
  return {
    emissionsTonne,
    factor: meta.factor,
    unit: meta.unit,
    source: meta.source,
    methodology: meta.methodology
  };
}

const initialSeed: DBState = {
  users: [
    {
      id: 'usr-1',
      name: 'Yuvraj Singh',
      email: 'singhyuvr.aj1211.gs@gmail.com',
      passwordHash: 'password123',
      role: 'ESG Manager',
      organisationId: 'org-apex'
    }
  ],
  organisations: [
    {
      id: DEFAULT_ORG_ID,
      name: 'Apex Precision Components Pvt. Ltd.',
      industry: 'Auto Components & Precision Engineering',
      location: 'Mohali, Punjab, India',
      employeeCount: 450,
      reportingYear: 'FY 2025-26',
      targetReductionPercent: 20
    }
  ],
  facilities: [
    {
      id: 'fac-mohali',
      organisationId: DEFAULT_ORG_ID,
      name: 'Mohali Manufacturing Plant',
      location: 'Industrial Area Phase 8, Mohali, Punjab',
      industryType: 'CNC Machining & Forging',
      productionOutput: 18500,
      productionUnit: 'Tonnes',
      reportingPeriod: 'FY 2025-26',
      electricityConsumption: 480000,
      fuelConsumption: 45000, // Diesel
      fuelType: 'Diesel',
      renewableEnergyUsage: 120000,
      emissionsScope1: 120.6, // (45000 * 2.68) / 1000 = 120.6
      emissionsScope2: 295.2, // ((480000 - 120000) * 0.82) / 1000 = 295.2
      carbonIntensity: 0.0225, // (120.6 + 295.2) / 18500
      esgReadinessStatus: 'Good'
    },
    {
      id: 'fac-pune',
      organisationId: DEFAULT_ORG_ID,
      name: 'Pune Component Facility',
      location: 'Chakan Industrial Area, Pune, Maharashtra',
      industryType: 'Metal Stamping & Heat Treatment',
      productionOutput: 14200,
      productionUnit: 'Tonnes',
      reportingPeriod: 'FY 2025-26',
      electricityConsumption: 620000,
      fuelConsumption: 12000, // Natural Gas
      fuelType: 'Natural Gas',
      renewableEnergyUsage: 0,
      emissionsScope1: 24.24, // (12000 * 2.02) / 1000 = 24.24
      emissionsScope2: 508.4, // (620000 * 0.82) / 1000 = 508.4
      carbonIntensity: 0.0375,
      esgReadinessStatus: 'Needs Improvement'
    },
    {
      id: 'fac-chennai',
      organisationId: DEFAULT_ORG_ID,
      name: 'Chennai Assembly Unit',
      location: 'Sriperumbudur, Chennai, Tamil Nadu',
      industryType: 'Precision Electronics Assembly',
      productionOutput: 8900,
      productionUnit: 'Tonnes',
      reportingPeriod: 'FY 2025-26',
      electricityConsumption: 290000,
      fuelConsumption: 5000, // Petrol
      fuelType: 'Petrol',
      renewableEnergyUsage: 220000, // High solar mix
      emissionsScope1: 11.55, // (5000 * 2.31) / 1000 = 11.55
      emissionsScope2: 57.4, // ((290000 - 220000) * 0.82) / 1000 = 57.4
      carbonIntensity: 0.0078,
      esgReadinessStatus: 'Excellent'
    }
  ],
  energyRecords: [
    {
      id: 'rec-1',
      organisationId: DEFAULT_ORG_ID,
      facilityId: 'fac-mohali',
      date: '2026-05-15',
      reportingPeriod: 'FY 2025-26',
      energyType: 'Grid Electricity',
      quantity: 40000,
      unit: 'kWh',
      sourceDocument: 'PSPCL_Bill_May2026.pdf',
      notes: 'Standard grid bill for Mohali line-A',
      emissions: 32.8,
      auditTrail: {
        emissionFactor: 0.82,
        factorUnit: 'kgCO2e/kWh',
        factorSource: 'CEA India Grid Emission Factor v19',
        methodology: 'Scope 2 Location-Based Electricity Emissions',
        calculatedAt: '2026-05-20T10:30:00Z'
      }
    },
    {
      id: 'rec-2',
      organisationId: DEFAULT_ORG_ID,
      facilityId: 'fac-mohali',
      date: '2026-05-18',
      reportingPeriod: 'FY 2025-26',
      energyType: 'Diesel',
      quantity: 3750,
      unit: 'Litres',
      sourceDocument: 'IOCL_Invoice_3992.pdf',
      notes: 'Fuel for backup generator power during peak shaving hours',
      emissions: 10.05,
      auditTrail: {
        emissionFactor: 2.68,
        factorUnit: 'kgCO2e/Litre',
        factorSource: 'IPCC 2006 Guidelines for Mobile/Stationary Combustion',
        methodology: 'Scope 1 Stationary/Mobile Combustion',
        calculatedAt: '2026-05-20T10:30:00Z'
      }
    },
    {
      id: 'rec-3',
      organisationId: DEFAULT_ORG_ID,
      facilityId: 'fac-pune',
      date: '2026-06-02',
      reportingPeriod: 'FY 2025-26',
      energyType: 'Natural Gas',
      quantity: 1000,
      unit: 'm3',
      sourceDocument: 'MGL_NG_Bill_Jun2026.pdf',
      notes: 'Billed consumption for heating furnaces',
      emissions: 2.02,
      auditTrail: {
        emissionFactor: 2.02,
        factorUnit: 'kgCO2e/m3',
        factorSource: 'IPCC 2006 Guidelines',
        methodology: 'Scope 1 Stationary Combustion',
        calculatedAt: '2026-06-05T14:15:00Z'
      }
    },
    {
      id: 'rec-4',
      organisationId: DEFAULT_ORG_ID,
      facilityId: 'fac-chennai',
      date: '2026-06-10',
      reportingPeriod: 'FY 2025-26',
      energyType: 'Renewable Electricity',
      quantity: 18333,
      unit: 'kWh',
      sourceDocument: 'Rooftop_Solar_Inverter_Report_Jun2026.xlsx',
      notes: 'On-site rooftop solar plant generation and direct consumption',
      emissions: 0.0,
      auditTrail: {
        emissionFactor: 0,
        factorUnit: 'kgCO2e/kWh',
        factorSource: 'GHG Protocol Scope 2',
        methodology: 'Zero Emission Renewable Procurement',
        calculatedAt: '2026-06-11T09:00:00Z'
      }
    }
  ],
  esgQuestions: {
    [DEFAULT_ORG_ID]: [
      {
        id: 'esg-1',
        category: 'Environmental',
        question: 'Does your company have a written, board-approved Environmental Policy covering all operating plants?',
        answer: 'Yes. Apex Precision Components has a comprehensive Environmental Policy signed by the Managing Director, covering waste management, energy conservation, and emissions control.',
        evidence: 'Apex_Environmental_Policy_2025.pdf',
        score: 9,
        status: 'Compliant',
        recommendation: 'Periodically review the policy to align with the latest BRSR Core requirement changes.',
        assignedUser: 'ESG Manager',
        reviewStatus: 'Approved'
      },
      {
        id: 'esg-2',
        category: 'Carbon',
        question: 'Do you systematically measure, calculate and verify your Scope 1 and Scope 2 GHG emissions?',
        answer: 'We measure electricity bills and diesel invoices to calculate Scope 1 and Scope 2 emissions monthly. However, external verification has not been completed yet.',
        evidence: 'FY2025-26_Emissions_Audit_Trail_Draft.xlsx',
        score: 6,
        status: 'Partial',
        recommendation: 'Engage an accredited third-party agency (like SGS or TÜV) to audit and verify emissions data for official export compliance.',
        assignedUser: 'ESG Manager',
        reviewStatus: 'In Review'
      },
      {
        id: 'esg-3',
        category: 'Compliance',
        question: 'Are all applicable factory consent to operate (CTO) licenses current and valid across all regions?',
        answer: 'The CTO licenses for Mohali and Chennai are fully valid. The Pune stamping plant CTO renewal application was submitted on time but is currently pending state pollution board clearance.',
        evidence: 'CTO_Mohali_Valid.pdf, CTO_Chennai_Valid.pdf, Pune_Renewal_Acknowledge_Receipt.pdf',
        score: 8,
        status: 'Partial',
        recommendation: 'Track Pune state pollution board correspondence weekly to ensure official approval and prevent operational compliance gaps.',
        assignedUser: 'Facility Manager (Pune)',
        reviewStatus: 'In Review'
      },
      {
        id: 'esg-4',
        category: 'Social',
        question: 'Does your facility enforce a strict Supplier Code of Conduct regarding child labor and fair wages for all vendors?',
        answer: 'We have a draft Supplier Code of Conduct, but we have not formally distributed it or requested signatures from our major raw material and steel sheet vendors.',
        evidence: 'Supplier_Code_Of_Conduct_Draft.pdf',
        score: 4,
        status: 'Non-Compliant',
        recommendation: 'Finalize the code, require compliance confirmation signatures from top 20 vendors by Q3, and organize an evidentiary document tracker.',
        assignedUser: 'Supply Chain Manager',
        reviewStatus: 'Missing Evidence'
      },
      {
        id: 'esg-5',
        category: 'Governance',
        question: 'Do you maintain an active Whistleblower Policy and an independent grievance redressal mechanism?',
        answer: 'Yes, we have an active whistleblower hotline and a POSH internal complaints committee (ICC) registered in our HR framework.',
        evidence: 'Whistleblower_Policy_Apex.pdf, ICC_POSH_AnnualReport_FY25.pdf',
        score: 10,
        status: 'Compliant',
        recommendation: 'Continue regular internal awareness sessions for plant floors and operational staff.',
        assignedUser: 'Compliance Officer',
        reviewStatus: 'Approved'
      }
    ]
  },
  oemQuestionnaires: [
    {
      id: 'oem-1',
      organisationId: DEFAULT_ORG_ID,
      title: 'Tata Motors Supplier ESG Compliance Survey',
      oemName: 'Tata Motors Ltd.',
      dueDate: '2026-08-15',
      status: 'In Progress',
      questions: [
        {
          id: 'oemq-1',
          question: 'Does your company measure and report annual greenhouse gas (GHG) Scope 1 and Scope 2 emissions for supplying units?',
          category: 'Carbon',
          suggestedAnswer: 'Yes. Apex Precision Components Pvt. Ltd. actively tracks energy consumption across Mohali, Pune, and Chennai facilities. Our combined Scope 1 and Scope 2 emissions for the ongoing period stand at 1,012.39 tCO2e, with a rigorous emission audit trail utilizing CEA and IPCC guidelines.',
          evidenceSource: 'FY2025-26 Carbon Footprint Summary Report',
          confidence: 'High',
          status: 'Ready for Review'
        },
        {
          id: 'oemq-2',
          question: 'Please state your renewable energy share (%) across your manufacturing operations.',
          category: 'Energy',
          suggestedAnswer: 'Our total renewable energy usage is approximately 24.4% of total electricity consumption (340,000 kWh out of 1,390,000 kWh total consumption), primarily driven by a 220 kW rooftop solar installation at our Chennai assembly unit and a solar offset plan in Mohali.',
          evidenceSource: 'Chennai Solar Inverter Log Reports, PSPCL Renewable Bills',
          confidence: 'High',
          status: 'Approved'
        },
        {
          id: 'oemq-3',
          question: 'Do you have an ISO 14001 certified Environmental Management System (EMS)?',
          category: 'Environment',
          suggestedAnswer: 'Mohali and Chennai manufacturing units are fully ISO 14001:2015 certified. The Pune stamping plant is currently preparing its manual and aims for certification by December 2026.',
          evidenceSource: 'ISO14001_Mohali_Certificate.pdf, ISO14001_Chennai_Certificate.pdf',
          confidence: 'Medium',
          status: 'Flagged'
        }
      ]
    }
  ],
  documents: [
    {
      id: 'doc-1',
      organisationId: DEFAULT_ORG_ID,
      name: 'Apex_Environmental_Policy_2025.pdf',
      category: 'ESG Policy',
      uploadDate: '2026-01-10',
      facilityId: 'fac-mohali',
      period: 'FY 2025-26',
      size: '1.4 MB',
      aiStatus: 'Processed',
      evidenceUsage: 'ESG Question E-1 (Environmental Policy Assessment)'
    },
    {
      id: 'doc-2',
      organisationId: DEFAULT_ORG_ID,
      name: 'PSPCL_Bill_May2026.pdf',
      category: 'Electricity Bill',
      uploadDate: '2026-05-16',
      facilityId: 'fac-mohali',
      period: 'FY 2025-26',
      size: '640 KB',
      aiStatus: 'Processed',
      evidenceUsage: 'Energy Record rec-1 (Mohali Electricity Consumption)'
    },
    {
      id: 'doc-3',
      organisationId: DEFAULT_ORG_ID,
      name: 'ISO14001_Mohali_Certificate.pdf',
      category: 'Environmental Certification',
      uploadDate: '2025-11-20',
      facilityId: 'fac-mohali',
      period: 'Multi-Year',
      size: '2.1 MB',
      aiStatus: 'Processed',
      evidenceUsage: 'OEM Questionnaire (EMS Certification Evidence)'
    }
  ],
  reports: [
    {
      id: 'rep-1',
      organisationId: DEFAULT_ORG_ID,
      title: 'FY2025-26 Consolidated Carbon Footprint & Energy Audit',
      type: 'Carbon Footprint',
      period: 'FY 2025-26 (Provisional)',
      createdDate: '2026-07-01',
      summary: 'Consolidated report tracking stationary combustion, purchased electricity, and carbon intensity metrics across three operating units in India.',
      status: 'Generated',
      downloadUrl: '#'
    }
  ],
  aiConversations: [
    {
      id: 'conv-1',
      organisationId: DEFAULT_ORG_ID,
      title: 'BRSR Compliance Strategy',
      lastUpdated: '2026-07-08T18:30:00Z',
      messages: [
        {
          id: 'msg-1',
          sender: 'user',
          text: 'What are our primary areas of focus to achieve full BRSR alignment?',
          timestamp: '2026-07-08T18:28:00Z'
        },
        {
          id: 'msg-2',
          sender: 'ai',
          text: 'Based on our analysis, Apex Precision Components should prioritize three items: First, formalize the draft Supplier Code of Conduct and distribute it for signing to your top steel and raw material vendors (Essential Indicator). Second, secure Pune state pollution board renewal for their CTO license to resolve the current compliance draft state. Third, complete an external energy audit for Chakan (Pune) which accounts for over 50% of your current carbon emissions.',
          timestamp: '2026-07-08T18:30:00Z',
          sources: [
            { title: 'ESG Assessment Compliance Category', type: 'Assessment Module' },
            { title: 'Pune Facility CTO Records', type: 'Facility Document' }
          ]
        }
      ]
    }
  ],
  auditLogs: [
    {
      id: 'log-1',
      organisationId: DEFAULT_ORG_ID,
      userId: 'usr-1',
      userEmail: DEFAULT_USER_EMAIL,
      action: 'Calculate Scope 1 & 2 Emissions',
      details: 'Calculated and logged 32.8 tCO2e emissions for Mohali Grid electricity consumption.',
      timestamp: '2026-07-09T01:10:00Z'
    }
  ]
};

export class Database {
  private state: DBState;

  constructor() {
    this.state = this.load();
  }

  private load(): DBState {
    try {
      let localBundledPath = path.join(process.cwd(), 'database.json');
      if (!fs.existsSync(localBundledPath)) {
        const parentPath = path.join(process.cwd(), '..', 'database.json');
        if (fs.existsSync(parentPath)) {
          localBundledPath = parentPath;
        } else {
          const varTaskPath = '/var/task/database.json';
          if (fs.existsSync(varTaskPath)) {
            localBundledPath = varTaskPath;
          }
        }
      }

      let sourcePath = DB_FILE_PATH;

      // On Vercel, if the writeable /tmp/database.json doesn't exist yet,
      // load from the read-only bundled database.json first to seed the state.
      if (process.env.VERCEL === '1' && !fs.existsSync(DB_FILE_PATH)) {
        if (fs.existsSync(localBundledPath)) {
          sourcePath = localBundledPath;
        }
      }

      if (fs.existsSync(sourcePath)) {
        const data = fs.readFileSync(sourcePath, 'utf-8');
        const parsed = JSON.parse(data);
        if (!parsed.users) {
          parsed.users = [...initialSeed.users];
        }
        return parsed as DBState;
      }
    } catch (e) {
      console.error('Error reading database file, loading default state:', e);
    }
    this.saveState(initialSeed);
    return initialSeed;
  }

  private saveState(state: DBState) {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing database file:', e);
    }
  }

  public getUsers(): AuthUser[] {
    return this.state.users || [];
  }

  public getUserByEmail(email: string): AuthUser | null {
    const lowercaseEmail = email.toLowerCase().trim();
    return this.getUsers().find(u => u.email.toLowerCase().trim() === lowercaseEmail) || null;
  }

  public addUser(name: string, email: string, passwordHash: string, organisationName: string): { user: AuthUser, organisation: Organisation } {
    const userId = `usr-${Date.now()}`;
    const orgId = `org-${Date.now()}`;
    
    const lowercaseEmail = email.toLowerCase().trim();

    // 1. Create and Seed Organisation
    const newOrg: Organisation = {
      id: orgId,
      name: organisationName,
      industry: 'Auto Components & Precision Engineering',
      location: 'Mohali, Punjab, India',
      employeeCount: 150,
      reportingYear: 'FY 2025-26',
      targetReductionPercent: 20
    };
    this.state.organisations.push(newOrg);

    // 2. Create User
    const newUser: AuthUser = {
      id: userId,
      name,
      email: lowercaseEmail,
      passwordHash,
      role: 'ESG Manager',
      organisationId: orgId
    };
    this.state.users.push(newUser);

    // 3. Seed two template facilities for a beautiful onboarding UX
    const newFac1: Facility = {
      id: `fac-${Date.now()}-1`,
      organisationId: orgId,
      name: 'Mohali Machining Unit',
      location: 'Industrial Area Phase 8, Mohali, Punjab',
      industryType: 'CNC Machining & Forging',
      productionOutput: 12000,
      productionUnit: 'Tonnes',
      reportingPeriod: 'FY 2025-26',
      electricityConsumption: 320000,
      fuelConsumption: 28000,
      fuelType: 'Diesel',
      renewableEnergyUsage: 60000,
      emissionsScope1: 75.04, // (28000 * 2.68) / 1000
      emissionsScope2: 213.2, // ((320000 - 60000) * 0.82) / 1000
      carbonIntensity: 0.02402,
      esgReadinessStatus: 'Good'
    };

    const newFac2: Facility = {
      id: `fac-${Date.now()}-2`,
      organisationId: orgId,
      name: 'Pune Stamping Plant',
      location: 'Chakan Industrial Area, Pune, Maharashtra',
      industryType: 'Metal Stamping & Heat Treatment',
      productionOutput: 9000,
      productionUnit: 'Tonnes',
      reportingPeriod: 'FY 2025-26',
      electricityConsumption: 450000,
      fuelConsumption: 10000,
      fuelType: 'Natural Gas',
      renewableEnergyUsage: 0,
      emissionsScope1: 20.2, // (10000 * 2.02) / 1000
      emissionsScope2: 369.0, // (450000 * 0.82) / 1000
      carbonIntensity: 0.04324,
      esgReadinessStatus: 'Needs Improvement'
    };
    
    this.state.facilities.push(newFac1, newFac2);

    // 4. Seed ESG Readiness assessment questions for the brand new organisation
    this.state.esgQuestions[orgId] = [
      {
        id: `esg-${Date.now()}-1`,
        category: 'Environmental',
        question: 'Does your company have a written, board-approved Environmental Policy covering all operating plants?',
        answer: 'Yes. Our newly established policy is signed by management, outlining our commitment to decarbonization and strict environmental compliance.',
        evidence: 'Environmental_Policy_Signed.pdf',
        score: 8,
        status: 'Compliant',
        recommendation: 'Periodically review the policy to align with the latest BRSR Core requirement changes.',
        assignedUser: name,
        reviewStatus: 'Approved'
      },
      {
        id: `esg-${Date.now()}-2`,
        category: 'Carbon',
        question: 'Do you systematically measure, calculate and verify your Scope 1 and Scope 2 GHG emissions?',
        answer: 'We calculate monthly emissions on this platform using verified CEA and IPCC emission factors. Third-party external audit has not been scheduled yet.',
        evidence: 'Carbon_Inventory_Draft.xlsx',
        score: 6,
        status: 'Partial',
        recommendation: 'Engage an accredited agency (SGS or TÜV) to verify emissions data for official export filing.',
        assignedUser: name,
        reviewStatus: 'In Review'
      },
      {
        id: `esg-${Date.now()}-3`,
        category: 'Social',
        question: 'Does your facility enforce a strict Supplier Code of Conduct regarding child labor and fair wages for all vendors?',
        answer: 'We have a draft Supplier Code of Conduct, but we have not formally distributed it or requested signatures from major vendors yet.',
        evidence: 'Supplier_Code_Of_Conduct_Draft.pdf',
        score: 4,
        status: 'Non-Compliant',
        recommendation: 'Finalize the code, distribute to top suppliers by Q3, and collect signed verification.',
        assignedUser: name,
        reviewStatus: 'Missing Evidence'
      }
    ];

    // 5. Seed template energy records
    const energyRec1: EnergyRecord = {
      id: `rec-${Date.now()}-1`,
      organisationId: orgId,
      facilityId: newFac1.id,
      date: '2026-06-01',
      reportingPeriod: 'FY 2025-26',
      energyType: 'Grid Electricity',
      quantity: 26000,
      unit: 'kWh',
      sourceDocument: 'Utility_Bill_Mohali.pdf',
      notes: 'Initial monthly utility bill setup',
      emissions: 21.32,
      auditTrail: {
        emissionFactor: 0.82,
        factorUnit: 'kgCO2e/kWh',
        factorSource: 'CEA India Grid Emission Factor v19',
        methodology: 'Scope 2 Location-Based Electricity Emissions',
        calculatedAt: new Date().toISOString()
      }
    };
    this.state.energyRecords.push(energyRec1);

    // Save and return
    this.saveState(this.state);
    this.log(orgId, 'Sign Up / Registration', `New corporate account created for ${organisationName} by user ${email}`);

    return { user: newUser, organisation: newOrg };
  }

  public getOrganisation(orgId: string = DEFAULT_ORG_ID): Organisation {
    return this.state.organisations.find(o => o.id === orgId) || this.state.organisations[0];
  }

  public updateOrganisation(org: Partial<Organisation>, orgId: string = DEFAULT_ORG_ID) {
    this.state.organisations = this.state.organisations.map(o => {
      if (o.id === orgId) {
        return { ...o, ...org };
      }
      return o;
    });
    this.saveState(this.state);
    return this.getOrganisation(orgId);
  }

  public getFacilities(orgId: string = DEFAULT_ORG_ID): Facility[] {
    return this.state.facilities.filter(f => f.organisationId === orgId);
  }

  public addFacility(facility: Omit<Facility, 'id' | 'organisationId' | 'emissionsScope1' | 'emissionsScope2' | 'carbonIntensity'>, orgId: string = DEFAULT_ORG_ID): Facility {
    const id = `fac-${Date.now()}`;
    // Run initial deterministic calculations
    const scope1calc = calculateEmissions(facility.fuelType as any, facility.fuelConsumption);
    const scope2calc = calculateEmissions('Grid Electricity', facility.electricityConsumption - facility.renewableEnergyUsage);
    
    const scope1 = scope1calc.emissionsTonne;
    const scope2 = scope2calc.emissionsTonne;
    const intensity = parseFloat(((scope1 + scope2) / (facility.productionOutput || 1)).toFixed(5));

    const newFac: Facility = {
      ...facility,
      id,
      organisationId: orgId,
      emissionsScope1: scope1,
      emissionsScope2: scope2,
      carbonIntensity: intensity,
      esgReadinessStatus: 'Good'
    };

    this.state.facilities.push(newFac);
    this.saveState(this.state);
    this.log(orgId, 'Add Facility', `Created facility ${facility.name} with intensity ${intensity}`);
    return newFac;
  }

  public updateFacility(facilityId: string, facility: Partial<Facility>, orgId: string = DEFAULT_ORG_ID): Facility | null {
    let found = false;
    this.state.facilities = this.state.facilities.map(f => {
      if (f.id === facilityId && f.organisationId === orgId) {
        found = true;
        const merged = { ...f, ...facility };
        
        // Recalculate
        const scope1calc = calculateEmissions(merged.fuelType as any, merged.fuelConsumption);
        const scope2calc = calculateEmissions('Grid Electricity', merged.electricityConsumption - merged.renewableEnergyUsage);
        merged.emissionsScope1 = scope1calc.emissionsTonne;
        merged.emissionsScope2 = scope2calc.emissionsTonne;
        merged.carbonIntensity = parseFloat(((merged.emissionsScope1 + merged.emissionsScope2) / (merged.productionOutput || 1)).toFixed(5));
        
        return merged;
      }
      return f;
    });

    if (found) {
      this.saveState(this.state);
      this.log(orgId, 'Update Facility', `Updated parameters for facility ${facilityId}`);
      return this.state.facilities.find(f => f.id === facilityId) || null;
    }
    return null;
  }

  public deleteFacility(facilityId: string, orgId: string = DEFAULT_ORG_ID): boolean {
    const originalLen = this.state.facilities.length;
    this.state.facilities = this.state.facilities.filter(f => !(f.id === facilityId && f.organisationId === orgId));
    const success = this.state.facilities.length < originalLen;
    if (success) {
      this.saveState(this.state);
      this.log(orgId, 'Delete Facility', `Deleted facility ID: ${facilityId}`);
    }
    return success;
  }

  public getEnergyRecords(orgId: string = DEFAULT_ORG_ID): EnergyRecord[] {
    return this.state.energyRecords.filter(r => r.organisationId === orgId);
  }

  public addEnergyRecord(record: Omit<EnergyRecord, 'id' | 'organisationId' | 'emissions' | 'auditTrail'>, orgId: string = DEFAULT_ORG_ID): EnergyRecord {
    const id = `rec-${Date.now()}`;
    const calc = calculateEmissions(record.energyType, record.quantity);

    const newRec: EnergyRecord = {
      ...record,
      id,
      organisationId: orgId,
      emissions: calc.emissionsTonne,
      auditTrail: {
        emissionFactor: calc.factor,
        factorUnit: calc.unit,
        factorSource: calc.source,
        methodology: calc.methodology,
        calculatedAt: new Date().toISOString()
      }
    };

    this.state.energyRecords.push(newRec);
    
    // Update facility aggregates if matching facility
    this.recalculateFacilityAggregates(record.facilityId, orgId);

    this.saveState(this.state);
    this.log(orgId, 'Add Energy Record', `Added ${record.energyType} record of ${record.quantity} ${record.unit}`);
    return newRec;
  }

  private recalculateFacilityAggregates(facilityId: string, orgId: string) {
    const records = this.state.energyRecords.filter(r => r.facilityId === facilityId && r.organisationId === orgId);
    let scope1 = 0;
    let scope2 = 0;
    let renew = 0;
    let elec = 0;

    records.forEach(r => {
      if (r.energyType === 'Grid Electricity') {
        elec += r.quantity;
        scope2 += r.emissions;
      } else if (r.energyType === 'Renewable Electricity') {
        renew += r.quantity;
        scope2 += r.emissions;
      } else {
        scope1 += r.emissions;
      }
    });

    this.state.facilities = this.state.facilities.map(f => {
      if (f.id === facilityId && f.organisationId === orgId) {
        return {
          ...f,
          electricityConsumption: elec + renew,
          renewableEnergyUsage: renew,
          emissionsScope1: parseFloat(scope1.toFixed(3)),
          emissionsScope2: parseFloat(scope2.toFixed(3)),
          carbonIntensity: parseFloat(((scope1 + scope2) / (f.productionOutput || 1)).toFixed(5))
        };
      }
      return f;
    });
  }

  public getESGQuestions(orgId: string = DEFAULT_ORG_ID): ESGQuestion[] {
    if (!this.state.esgQuestions[orgId]) {
      this.state.esgQuestions[orgId] = [...initialSeed.esgQuestions[DEFAULT_ORG_ID]];
      this.saveState(this.state);
    }
    return this.state.esgQuestions[orgId];
  }

  public updateESGQuestion(questionId: string, updates: Partial<ESGQuestion>, orgId: string = DEFAULT_ORG_ID): ESGQuestion | null {
    const list = this.getESGQuestions(orgId);
    let updated: ESGQuestion | null = null;
    this.state.esgQuestions[orgId] = list.map(q => {
      if (q.id === questionId) {
        updated = { ...q, ...updates };
        return updated;
      }
      return q;
    });
    this.saveState(this.state);
    if (updated) {
      this.log(orgId, 'Update ESG Question', `Updated assessment item: ${questionId}`);
    }
    return updated;
  }

  public getOEMQuestionnaires(orgId: string = DEFAULT_ORG_ID): OEMQuestionnaire[] {
    return this.state.oemQuestionnaires.filter(q => q.organisationId === orgId);
  }

  public addOEMQuestionnaire(title: string, oemName: string, dueDate: string, orgId: string = DEFAULT_ORG_ID): OEMQuestionnaire {
    const id = `oem-${Date.now()}`;
    const newQ: OEMQuestionnaire = {
      id,
      organisationId: orgId,
      title,
      oemName,
      dueDate,
      status: 'Not Started',
      questions: [
        {
          id: `oemq-${Date.now()}-1`,
          question: 'Do you systematically assess the carbon footprint of your raw material shipments?',
          category: 'Scope 3 Supply Chain',
          suggestedAnswer: 'We currently do not track supplier Scope 3 emissions systematically, but our supplier code of conduct is being implemented in FY 2026-27 to collect primary emissions data from key transport providers.',
          evidenceSource: 'Supplier Engagement Plan Draft',
          confidence: 'Medium',
          status: 'Draft'
        }
      ]
    };
    this.state.oemQuestionnaires.push(newQ);
    this.saveState(this.state);
    this.log(orgId, 'Create OEM Questionnaire', `Initiated compliance survey for ${oemName}`);
    return newQ;
  }

  public updateOEMQuestionnaire(id: string, updates: Partial<OEMQuestionnaire>, orgId: string = DEFAULT_ORG_ID): OEMQuestionnaire | null {
    let found = false;
    this.state.oemQuestionnaires = this.state.oemQuestionnaires.map(q => {
      if (q.id === id && q.organisationId === orgId) {
        found = true;
        return { ...q, ...updates };
      }
      return q;
    });
    if (found) {
      this.saveState(this.state);
      return this.state.oemQuestionnaires.find(q => q.id === id) || null;
    }
    return null;
  }

  public updateOEMQuestionStatus(surveyId: string, questionId: string, status: any, suggestedAnswer?: string, orgId: string = DEFAULT_ORG_ID): boolean {
    let modified = false;
    this.state.oemQuestionnaires = this.state.oemQuestionnaires.map(survey => {
      if (survey.id === surveyId && survey.organisationId === orgId) {
        survey.questions = survey.questions.map(q => {
          if (q.id === questionId) {
            modified = true;
            return {
              ...q,
              status,
              ...(suggestedAnswer !== undefined ? { suggestedAnswer } : {})
            };
          }
          return q;
        });
      }
      return survey;
    });
    if (modified) {
      this.saveState(this.state);
    }
    return modified;
  }

  public getDocuments(orgId: string = DEFAULT_ORG_ID): Document[] {
    return this.state.documents.filter(d => d.organisationId === orgId);
  }

  public addDocument(doc: Omit<Document, 'id' | 'organisationId' | 'aiStatus'>, orgId: string = DEFAULT_ORG_ID): Document {
    const id = `doc-${Date.now()}`;
    const newDoc: Document = {
      ...doc,
      id,
      organisationId: orgId,
      aiStatus: 'Processed' // instantly process for premium user experience
    };
    this.state.documents.push(newDoc);
    this.saveState(this.state);
    this.log(orgId, 'Upload Document', `Uploaded compliance document ${doc.name} as ${doc.category}`);
    return newDoc;
  }

  public deleteDocument(docId: string, orgId: string = DEFAULT_ORG_ID): boolean {
    const originalLen = this.state.documents.length;
    this.state.documents = this.state.documents.filter(d => !(d.id === docId && d.organisationId === orgId));
    const success = this.state.documents.length < originalLen;
    if (success) {
      this.saveState(this.state);
      this.log(orgId, 'Delete Document', `Deleted document ${docId}`);
    }
    return success;
  }

  public getReports(orgId: string = DEFAULT_ORG_ID): Report[] {
    return this.state.reports.filter(r => r.organisationId === orgId);
  }

  public generateReport(title: string, type: string, period: string, summary: string, orgId: string = DEFAULT_ORG_ID): Report {
    const id = `rep-${Date.now()}`;
    const newRep: Report = {
      id,
      organisationId: orgId,
      title,
      type: type as any,
      period,
      createdDate: new Date().toISOString().split('T')[0],
      summary,
      status: 'Generated',
      downloadUrl: '#'
    };
    this.state.reports.push(newRep);
    this.saveState(this.state);
    this.log(orgId, 'Generate Report', `Generated executive report: ${title}`);
    return newRep;
  }

  public getConversations(orgId: string = DEFAULT_ORG_ID): AIConversation[] {
    return this.state.aiConversations.filter(c => c.organisationId === orgId);
  }

  public addAIConversationMessage(title: string, message: Omit<AIMessage, 'id' | 'timestamp'>, orgId: string = DEFAULT_ORG_ID): AIConversation {
    let conv = this.state.aiConversations.find(c => c.organisationId === orgId && c.title === title);
    
    const msgWithMeta: AIMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    if (!conv) {
      conv = {
        id: `conv-${Date.now()}`,
        organisationId: orgId,
        title,
        lastUpdated: new Date().toISOString(),
        messages: [msgWithMeta]
      };
      this.state.aiConversations.push(conv);
    } else {
      conv.messages.push(msgWithMeta);
      conv.lastUpdated = new Date().toISOString();
      this.state.aiConversations = this.state.aiConversations.map(c => c.id === conv!.id ? conv! : c);
    }

    this.saveState(this.state);
    return conv;
  }

  public getAuditLogs(orgId: string = DEFAULT_ORG_ID): AuditLog[] {
    return this.state.auditLogs.filter(l => l.organisationId === orgId).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
  }

  public log(orgId: string, action: string, details: string) {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      organisationId: orgId,
      userId: 'usr-1',
      userEmail: DEFAULT_USER_EMAIL,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    this.state.auditLogs.push(newLog);
    this.saveState(this.state);
  }
}

export const db = new Database();
