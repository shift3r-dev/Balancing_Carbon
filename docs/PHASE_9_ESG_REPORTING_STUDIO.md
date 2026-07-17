# Phase 9 - ESG Reporting Studio

## Status

Implemented. Apply `server/migrations/024_esg_reporting_studio.sql` after migration 023 before using the studio.

## Delivered capabilities

- Framework templates for Integrated Annual Report, BRSR, GRI, ISSB, CSRD, TCFD, GHG Protocol, SECR, and management carbon reporting.
- A responsive three-pane studio with a report library, page canvas, property inspector, page layouts, and drag-and-drop block ordering.
- Heading, narrative, KPI, chart, table, image, callout, spacer, evidence, brand, and cross-reference controls.
- Automatic Figure and Table numbering with cross-reference resolution during export.
- Local Ollama narrative drafting for leadership messages, summaries, risks, progress, and roadmaps. AI text requires explicit human application.
- Immutable composition checkpoints and separate draft, review, approval, changes-requested, publish, and locked states.
- Real PDF, DOCX, PPTX, and XLSX generation with export audit records.

## Data model

| Table | Purpose |
| --- | --- |
| `report_brand_kits` | Tenant branding and page defaults |
| `report_studio_pages` | Ordered report pages and layouts |
| `report_studio_blocks` | Ordered structured content blocks |
| `report_block_evidence` | Document/calculation evidence attached to a block |
| `report_cross_references` | Durable block-to-block reference metadata |
| `report_narrative_generations` | AI draft, model, citations, author, and acceptance audit data |

## API index

| Method and route | Purpose |
| --- | --- |
| `GET /api/reporting/brand-kits` | List tenant brand kits |
| `POST /api/reporting/brand-kits` | Create a brand kit |
| `PUT /api/reporting/reports/:id/studio` | Save pages, blocks, ordering, and branding |
| `POST /api/reporting/reports/:id/studio/version` | Create an immutable composition checkpoint |
| `POST /api/reporting/reports/:id/studio/evidence` | Link governed evidence to a block |
| `POST /api/reporting/reports/:id/studio/narrative` | Draft a grounded narrative through the configured AI provider |
| `POST /api/reporting/reports/:id/submit-review` | Submit a draft for review |
| `POST /api/reporting/reports/:id/approvals` | Approve or request changes |
| `POST /api/reporting/reports/:id/publish` | Publish and lock an approved report |
| `POST /api/reporting/reports/:id/exports` | Generate PDF, DOCX, PPTX, XLSX, CSV, JSON, or legacy Excel |

## Security and governance

- Every studio row carries `organisation_id`; API reads and writes are tenant scoped.
- Studio editing and AI drafting have separate permissions and entitlements.
- Auditors do not receive studio-edit or AI-drafting permissions.
- Published reports are locked from editing.
- AI receives verified tenant context and cannot write directly into report content.
- Calculation and validation snapshots remain attached to each report version.

## Verification

- `npm run test:studio` validates numbering, cross references, and PDF/Office signatures.
- `npm run lint` validates TypeScript.
- `npm run build` validates the production frontend and bundled server.

## Deployment boundary

Exports are returned inline by the API. Production should move completed files to private object storage and issue short-lived signed URLs. Image blocks currently accept a URL or data URL; governed image uploads remain a future hardening item.
