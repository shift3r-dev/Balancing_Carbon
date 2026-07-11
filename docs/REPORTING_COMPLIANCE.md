# Reporting and Compliance Platform

Phase 6 adds a versioned reporting layer over the Phase 5 carbon ledger. A generated report snapshots current `calculation_records`, their activity data, verification state, factor versions, and linked calculation references. It does not recalculate data in the browser or call an AI service.

## First live framework

`BRSR` is the first active framework. CDP, GRI, ISSB, and CSRD are architecture-only frameworks, ready for future templates. BRSR templates are available to Professional and Enterprise organisations through the `reports.compliance` entitlement. The management carbon template is available wherever report generation is enabled.

## Apply order

Run these files in Supabase SQL Editor, in order:

1. `server/migrations/011_reporting_compliance_foundation.sql`
2. `server/migrations/015_phase6_reporting_runtime.sql`

Migration 015 assumes Phase 3 and Phase 4 entitlement data exist (`007`, `008`, `009`, `012`, and `013`). It is additive and keeps the existing `reports` API working.

## API

- `GET /api/reporting/frameworks`
- `GET|POST /api/reporting/templates`
- `GET /api/reporting/reports`
- `GET /api/reporting/reports/:id`
- `POST /api/reporting/reports/generate`
- `POST /api/reporting/reports/:id/submit-review`
- `POST /api/reporting/reports/:id/approvals`
- `POST /api/reporting/reports/:id/exports` with `pdf`, `excel`, `csv`, or `json`
- `POST /api/reporting/schedules`

PDF, Excel-compatible SpreadsheetML, CSV, and JSON are generated in-process from stored report versions. `report_exports` records the export event. Schedule settings are persisted inactive until a background delivery worker and outbound email service are introduced.

## Permission model

`report.create`, `report.edit`, `report.review`, `report.approve`, `report.publish`, and `report.schedule` are database permissions. Organisation admins receive all reporting permissions; sustainability managers can author, review, export, and schedule; auditors can review, approve, and export. All mutations require an operational licence.
