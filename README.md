# Balancing Carbon

**Industrial Carbon Intelligence, ESG Readiness, and Decarbonization Infrastructure for Indian Manufacturers and Exporters.**

Balancing Carbon is a B2B sustainability technology platform designed to help manufacturers, exporters, and industrial enterprises measure greenhouse-gas emissions, manage energy and fuel consumption, assess ESG readiness, maintain compliance evidence, respond to OEM sustainability questionnaires, and prepare audit-ready environmental reports.

The platform combines multi-tenant cloud infrastructure, deterministic carbon accounting, ESG compliance workflows, and AI-assisted sustainability intelligence in a unified industrial dashboard.

---

## Overview

Indian manufacturers increasingly face environmental disclosure requirements from OEM customers, international supply chains, regulators, auditors, and carbon-border mechanisms such as the European Union's Carbon Border Adjustment Mechanism (CBAM).

Balancing Carbon provides a structured digital infrastructure for managing these requirements.

The platform is designed around five core capabilities:

- Carbon accounting and emissions measurement
- Multi-facility industrial data management
- ESG readiness assessment
- OEM sustainability questionnaire workflows
- Environmental evidence and compliance documentation

The long-term objective is to create an intelligent operating system for industrial decarbonization and sustainability compliance.

---

## Key Features

### Multi-Tenant Corporate Accounts

Each registered organization receives an isolated tenant environment containing its own:

- Corporate profile
- Facilities
- Energy records
- Carbon emissions
- ESG assessments
- OEM questionnaires
- Compliance documents
- Reports

Authentication and organization-level data isolation are handled through a Supabase-backed architecture.

---

### Facility Management

Organizations can register and manage multiple manufacturing facilities.

Each facility can contain operational information including:

- Facility name
- Geographic location
- Industry type
- Production output
- Production units
- Reporting period
- Electricity consumption
- Fuel consumption
- Fuel type
- Renewable-energy usage
- Scope 1 emissions
- Scope 2 emissions
- Carbon intensity
- ESG readiness status

The dashboard automatically presents facility-level environmental performance metrics.

---

### Carbon Accounting Engine

Balancing Carbon provides deterministic greenhouse-gas calculations for industrial operations.

#### Scope 1 — Direct Emissions

Calculate emissions generated directly from fuel combustion and industrial energy usage.

Typical sources include:

- Diesel
- Petrol
- LPG
- Natural gas
- Furnace fuels
- Other combustion sources

#### Scope 2 — Purchased Electricity

Calculate indirect emissions associated with purchased electricity using electricity-grid emission factors.

The architecture is designed to support region-specific and reporting-period-specific emission coefficients.

#### Scope 3 — Supply Chain Emissions

The platform architecture includes support for future Scope 3 capabilities covering indirect value-chain emissions.

---

## Energy & Fuel Ledger

Organizations can maintain structured records of energy consumption across facilities.

The ledger provides a foundation for:

- Electricity tracking
- Fuel consumption records
- Renewable-energy monitoring
- Emission calculations
- Facility-level carbon-intensity analysis
- Historical environmental reporting

---


## ESG Readiness Assessment

The ESG assessment module helps organizations evaluate their environmental, social, and governance readiness.

The platform can track:

- ESG questions
- Current responses
- Evidence requirements
- Compliance status
- Readiness gaps
- Supporting documentation

This allows organizations to identify weaknesses before customer, investor, OEM, or regulatory audits.

---

## OEM Questionnaire Management

Manufacturers frequently receive sustainability questionnaires from customers and OEM supply chains.

Balancing Carbon provides tools to:

- Create OEM questionnaires
- Manage sustainability questions
- Track questionnaire deadlines
- Review suggested answers
- Approve responses
- Associate answers with operational data and evidence

The system is designed to reduce repetitive manual work involved in responding to customer sustainability audits.

---

## Evidence Document Centre

The Document Centre provides a structured environmental evidence repository.

Organizations can manage documents such as:

- Electricity invoices
- Fuel purchase records
- Pollution Control Board permits
- Consent-to-Operate documents
- Environmental policies
- Renewable-energy agreements
- ESG certificates
- Carbon audit reports
- Supplier compliance documentation

The objective is to create an audit-ready evidence trail linking sustainability claims to supporting documentation.

---

## Reports Centre

Users can create structured environmental and sustainability reports.

Current report categories include:

- BRSR Core Audit Reports
- ISO 14064 GHG Statements
- OEM Supplier Compliance Reports
- Scope 2 Electricity Offsetting Summaries

Reports can contain:

- Report title
- Filing or audit standard
- Reporting period
- Executive summary
- Environmental performance information

---

## Carbon AI Assistant

The platform includes an AI-assistant interface intended to help organizations interact with their sustainability data.

Potential capabilities include:

- Carbon-accounting assistance
- ESG questionnaire drafting
- Compliance guidance
- Environmental data interpretation
- Document intelligence
- Sustainability recommendations
- Anomaly detection
- Decarbonization opportunity identification

AI-generated outputs should be treated as decision-support information and reviewed before regulatory or audit submission.

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React

### Backend

- Node.js
- TypeScript
- REST API architecture
- Vercel Serverless Functions

### Database & Authentication

- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security architecture

### Deployment

- Vercel

---

## Project Structure

```text
Balancing_Carbon/
├── api/
│   └── index.js
│
├── public/
│
├── server/
│
├── src/
│   ├── components/
│   │   ├── AIAssistantModule.tsx
│   │   ├── AssessmentForm.tsx
│   │   ├── AsymmetricInfinityLogo.tsx
│   │   ├── CarbonEngineUI.tsx
│   │   ├── DashboardOverview.tsx
│   │   ├── DashboardSidebar.tsx
│   │   ├── DocumentCentre.tsx
│   │   ├── EnergyTracking.tsx
│   │   ├── ESGAssessmentModule.tsx
│   │   ├── FacilityManagement.tsx
│   │   └── OEMQuestionnaireModule.tsx
│   │
│   ├── App.tsx
│   ├── types.ts
│   └── main.tsx
│
├── .env.example
├── .gitignore
├── index.html
├── metadata.json
├── package.json
├── server.ts
├── tsconfig.json
├── vercel.json
└── vite.config.ts