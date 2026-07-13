# Formal Phase 10 - Enterprise Analytics Platform

## Status

Implemented. Apply `server/migrations/026_enterprise_analytics_platform.sql` after migration 025.

## Architecture

The Analytics Platform does not persist alternate emission totals. Every query reads current `calculation_records`, joins tenant-scoped activity lineage, and uses compatible production records only where an intensity denominator is required.

The platform contains:

- A governed carbon-ledger dataset registry.
- System and tenant KPI definitions.
- An allow-listed arithmetic formula parser with no functions, code execution, property access or unknown variables.
- Tenant dashboards and widgets.
- User-owned saved filter views and bookmarks.
- Audited CSV and JSON exports.
- Internal facility benchmarking.
- Saved scenario comparison.
- Transparent ordinary-least-squares trend projection.
- Deterministic calculation insights.
- Optional read-only Ollama explanation of filtered aggregates.

## Studio capabilities

- KPI, line, bar, stacked bar, donut, table, heatmap, location and insight widgets.
- Responsive twelve-column desktop layout and single-column small-screen layout.
- Date, facility, scope and source filters.
- Cross-filtering from facility, source and scope charts.
- Drill-through to calculation ID, activity ID, factor version, verification state and evidence count.
- Private or organisation-visible dashboard definitions.
- Layout editing, widget ordering and custom KPI creation.
- Saved views, bookmarks, CSV and JSON exports.
- Executive default dashboard generated without duplicating source data.

## Analytics semantics

### Projection

The projection extends a linear trend from at least two monthly observations. The response includes method and observation count. It is not called a prediction, target, guarantee or causal forecast.

### Benchmark

The initial benchmark is the median intensity across facilities in the current tenant and filter boundary. No external industry benchmark is inferred. Facilities without compatible production output are excluded from intensity comparison.

### Scenario comparison

Scenario results come from the deterministic Phase 2 scenario engine and retain their saved baselines and assumptions. Analytics does not recalculate or relabel scenarios as forecasts.

### AI explanation

Carbon Copilot receives bounded KPI aggregates and grouped series, not raw unrestricted tenant data. The prompt prohibits causal, assurance, compliance and future-outcome claims. AI output remains advisory and cannot mutate dashboards or ledgers.

## Data model

| Table | Purpose |
| --- | --- |
| `analytics_datasets` | Governed dataset catalog and grain |
| `analytics_kpi_definitions` | System and tenant KPI formulas |
| `analytics_dashboards` | Tenant dashboard ownership and visibility |
| `analytics_widgets` | Ordered widget definitions and layout |
| `analytics_saved_views` | User-owned reusable filters |
| `analytics_bookmarks` | User-owned dashboard state snapshots |
| `analytics_exports` | Export audit events |

## API index

| Method and route | Purpose |
| --- | --- |
| `GET /api/analytics/catalog` | Datasets, KPIs, dashboards, views, bookmarks, facilities and feature flags |
| `POST /api/analytics/query` | Tenant-scoped filtered KPI, series, benchmark, scenario, insight and drill data |
| `POST /api/analytics/explain` | Optional local-Copilot explanation of filtered aggregates |
| `POST /api/analytics/kpis` | Create a validated tenant KPI |
| `POST /api/analytics/dashboards` | Create a dashboard |
| `PUT /api/analytics/dashboards/:id` | Save dashboard definition and widgets |
| `POST /api/analytics/saved-views` | Save personal filters |
| `POST /api/analytics/bookmarks` | Bookmark persisted dashboard state |
| `POST /api/analytics/export` | Audited CSV or JSON export |

## Access control

- `analytics.view` allows governed reads.
- `analytics.edit` allows KPI and dashboard composition.
- Starter receives trend viewing through the existing `analytics.trends` entitlement.
- Professional and Enterprise receive `analytics.studio`.
- Enterprise receives `analytics.forecasting`.
- AI explanation additionally requires `ai.use` and `analytics.calculation_insights`.
- Every operational query and stored object is constrained by the authorized organisation.

## Verification

- `npm run test:analytics` tests formula precedence, unknown-variable rejection, function/property-access rejection, zero denominators and deterministic projection.
- `npm run lint` validates TypeScript.
- `npm run build` validates the production frontend and bundled API.

## Future hardening

- Replace multi-statement dashboard widget saves with a transactional database RPC.
- Add approved, licensed external benchmark datasets with methodology and provenance.
- Add private object storage for large export files.
- Add materialized aggregates only after measured query-volume requirements justify them.
