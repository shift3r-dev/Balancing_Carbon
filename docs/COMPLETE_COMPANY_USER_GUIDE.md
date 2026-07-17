# Balancing Carbon - Complete Company User Guide

This guide follows a company from its first website visit through routine carbon accounting, governance, reporting, and administration.

## 1. Explore the public website

The visitor lands on the Balancing Carbon website and can review:

- Sector-first services for industry-specific use cases
- Service-first offerings across accounting, compliance, resource efficiency, and reporting
- The public carbon calculator for a non-auditable estimate
- Pricing plans and included capabilities
- About and resource pages

The public calculator is a sandbox. Its results are not added to the company ledger until the visitor registers and enters auditable activity data.

## 2. Register the company account

Select **Register**, then provide the user name, work email, password, organisation name, plan, and billing interval.

Registration creates or initializes:

- Supabase authentication identity
- User profile
- Organisation
- Organisation administrator membership and role
- Subscription record and effective entitlements
- Default localization and measurement preferences

After registration, confirm the email address if email confirmation is enabled in Supabase. Sign in with the registered credentials.

## 3. Understand the dashboard

After login, the authenticated dashboard opens. The sidebar is grouped into:

- **Command Center:** overview, organisation, and facilities
- **Carbon Inventory:** calculator, energy ledger, production, and emission scopes
- **Intelligence:** diagnostics, hotspots, scenarios, and projects
- **Reporting & Evidence:** reports, documents, OEM questionnaires, and ESG readiness
- **System:** Data Hub, Metadata Studio, subscription/settings, and the local Carbon Copilot

The overview summarizes operational footprint, Scope 1 and Scope 2 emissions, intensity, renewable share, data quality, projects, source contribution, trends, and facility performance.

## 4. Configure the organisation

Open **Organisation** and complete the legal and reporting profile:

- Legal and display name
- Industry and sub-industry
- Country, state, city, and address
- Employee count
- Fiscal year, reporting year, and base year
- Organisational and operational boundaries
- Reporting framework
- Reduction target

These settings provide context for facilities, calculations, reports, and localization.

## 5. Configure localization and units

Open **System Settings** and configure:

- Language
- Country and currency
- Time zone
- Number and date formats
- Measurement system
- Decimal precision
- Preferred units for energy, mass, water, distance, carbon, and production

Changing display preferences does not rewrite canonical stored quantities or calculation lineage.

## 6. Create facilities

Open **Facilities** and select **Add Factory Unit**. Enter the facility name, location, industry type, production output, energy baseline, fuel baseline, fuel type, and renewable generation.

Each facility card displays its database ID with a copy button. Use this ID in CSV or Excel imports. Data Hub also provides a registered-facility selector that inserts the ID into a sample CSV automatically.

Facilities are tenant-scoped. A record cannot be posted against a facility belonging to another organisation.

## 7. Add data manually

Open **Energy Ledger** and select **Log Activity Record**. Enter:

- Facility
- Activity date and reporting period
- Source type
- Quantity and unit
- Evidence reference
- Notes

The server resolves a current emission factor, converts the input to the factor unit, calculates emissions, and stores:

- Energy record
- Activity record
- Calculation record
- Factor ID and version
- Conversion path
- Evidence snapshot

Production output can be entered beside the energy form. Production records provide the denominator for carbon-intensity calculations.

## 8. Import data through Data Hub

Open **Data Hub → Import**.

1. Select a source definition: energy, production, water, waste, air emissions, or raw materials.
2. Select a registered facility and use it in the sample, or upload a `.csv` or `.xlsx` file.
3. Select **Validate and preview**.
4. Review automatic column mappings.
5. Correct mappings or load a saved mapping.
6. Revalidate after changes.
7. Review valid, invalid, duplicate, anomaly, and confidence results.
8. Save the mapping when it should be reused.
9. Select **Add valid rows to staging**.

Invalid rows remain in the import job with precise issues. Duplicate signatures prevent the same operational row from being staged twice.

## 9. Govern data in the staging ledger

Open **Data Hub → Staging**. A reviewer can:

- Inspect canonical mapped data
- Review the source file and quality score
- Approve a staged record
- Reject a staged or approved record
- Post an approved record

Posting routes data to the correct operational ledger:

- Energy → `energy_records`, activity lineage, calculation lineage, dashboard aggregates
- Production → `production_records` and activity lineage
- Water → `water_records`
- Waste → `waste_records`
- Materials → `material_records`
- Air emissions → `air_emission_records`

The staging record remains with status `posted` as the import audit trail. The dashboard refreshes automatically after energy or production posting.

## 10. Monitor operational and environmental ledgers

Use **Energy Ledger** for carbon-generating activity and production output. Use **Data Hub → Environmental Ledgers** for water, waste, materials, and air-emission records.

Filter energy records by facility, source, scope, reporting period, or date. Use evidence and factor information to identify records requiring review.

## 11. Manage the dashboard

The dashboard is calculated from stored operational records, not from public sandbox estimates.

Review:

- Total and facility emissions
- Scope distribution
- Carbon intensity
- Renewable share
- Largest sources and hotspots
- Month-over-month trends
- Data completeness and confidence

If new records do not appear, verify that they were posted rather than only staged and that the selected reporting dates are within the dashboard period.

## 12. Use diagnostics and planning

Open the Intelligence section to:

- Answer diagnostic questions
- Identify data and operational gaps
- Review hotspots
- Model reduction scenarios
- Compare baseline and projected emissions
- Create decarbonization projects
- Track planned reductions, cost, owners, and status

Scenario results do not alter the carbon ledger. They remain planning artifacts until projects or operational changes are recorded.

## 13. Manage documents and evidence

Open **Documents** to upload bills, invoices, meter records, certificates, policies, and supporting files. PDF, DOCX, TXT, CSV, Markdown, and JSON files up to 10 MB are stored in the private tenant evidence bucket.

The vault shows extraction status. `completed` files can provide question-relevant excerpts to Carbon Copilot, `empty` commonly indicates an image-only scan, and `failed` requires review. Downloads use short-lived signed links. Production deployments should add malware scanning and retention policies before accepting external customer files.

## 14. Complete ESG and OEM workflows

Use **ESG Readiness** to answer governance, environmental, and social questions, attach evidence references, assign owners, and review gaps.

Use **OEM** for customer or supply-chain questionnaires. Track due dates, completion, evidence, and review status.

## 15. Generate and approve reports

Open **Reports** to:

1. Select a framework and template.
2. Choose the reporting period.
3. Generate a report snapshot from current calculations.
4. Review validation and evidence completeness.
5. Submit the report for review.
6. Approve, reject, or request changes according to permissions.
7. Export supported PDF, Excel, CSV, or JSON outputs.

Generated reports preserve calculation snapshots and version history so later ledger changes do not silently rewrite approved reporting evidence.

## 16. Customize forms through Metadata Studio

Organisation administrators can open **Metadata Studio** to create supplemental forms without changing application source code.

- Select an entity such as Facility, Project, Supplier, or Document.
- Start from an industry template or create a tenant form.
- Add fields and sections.
- Reorder layouts.
- Configure validations and metadata.
- Preview the dynamic renderer.
- Save and version the tenant-owned form.

System templates remain read-only. Tenant forms can be customized safely.

## 17. Manage subscriptions and access

Open **System Settings** to review the current plan, limits, and entitlements. Organisation administrators manage members and role assignments through the available account administration APIs and screens.

Important roles include organisation administrator, sustainability manager, plant manager, operator, and auditor. Permissions control facilities, activities, reports, metadata, data imports, connectors, and staging approval.

## 18. Use Carbon Copilot

Open **Carbon AI Assistant** to ask questions about recorded emissions, facilities, evidence, reports, ESG gaps, opportunities, and projects.

- Responses are grounded in the signed-in organisation only.
- Source controls navigate to the relevant operational module.
- Extracted document citations use `X` identifiers.
- Suggested actions remain advisory and never update the ledger.
- Cancel a long-running local request with the stop control.
- Administrators with audit access can review request count, failure rate, latency, and token usage.

Do not treat Copilot output as a verified calculation or regulatory opinion. Calculations remain in the deterministic accounting engine, and formal reports still require review and approval.

## 19. Routine monthly operating cycle

A typical monthly process is:

1. Collect bills, meter exports, fuel invoices, production output, water, and waste records.
2. Upload files through Data Hub or enter exceptional records manually.
3. Resolve mapping and validation issues.
4. Approve and post staged records.
5. Confirm facility totals and trends.
6. Review missing evidence and data quality.
7. Update projects and reduction scenarios.
8. Generate internal management reports.
9. At reporting deadlines, freeze, review, approve, and export formal reports.

## 20. Controls before production launch

Before onboarding real customers:

- Replace prototype emission factors with approved authoritative factors
- Configure Supabase production RLS policies and separate service credentials
- Validate private object storage, add malware scanning, retention, and backups
- Configure secrets management for connector credentials
- Add rate limiting, observability, alerts, and background workers
- Complete penetration, dependency, load, disaster-recovery, and privacy testing
- Configure outbound email and scheduled reporting workers
- Review the local AI deployment, model license, privacy policy, retention, access controls, and production hosting boundary

## 21. Support troubleshooting

- **API endpoint returns 404:** restart the Node server after backend code changes.
- **Facility is invalid:** use the copyable facility ID, not the name.
- **Row is skipped:** check duplicate count and signature.
- **Post is unavailable:** approve the staged record first.
- **Factor error:** confirm the source type has an active registry factor for the facility country and date.
- **Unit error:** select a compatible unit from the central registry.
- **Dashboard is unchanged:** confirm the row is posted and within the active reporting period.
- **Copilot is offline:** confirm the configured AI provider is enabled, its server-side credential is present, and the selected model is available.
- **Document has no excerpts:** check extraction status; scanned PDFs require a future OCR service.
