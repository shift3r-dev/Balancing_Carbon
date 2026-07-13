# Formal Phase 11 - Sustainability Intelligence Platform

## Status

Implemented. Apply `server/migrations/027_sustainability_intelligence_platform.sql` after migration 026.

## Delivered modules

- Carbon Reduction Planner using recorded gaps and existing quantified opportunities.
- Net-zero pathway builder with explicit baseline, target year and residual endpoint.
- Marginal Abatement Cost Curve using opportunity capex, annual savings, reduction and a disclosed planning lifetime.
- Multi-resource target tracker and progress calculation.
- SBTi readiness screening that never claims validation, alignment approval or certification.
- Supplier data-readiness and engagement assessments.
- Internal programme-readiness score, explicitly not an external ESG rating.
- Internal facility and programme context; no invented industry benchmark.
- Renewable, energy, water and waste investigation prompts based on recorded data.
- Residual-emissions and carbon-credit planning that enforces the avoid/reduce/replace/neutralize hierarchy.

## Methodological boundaries

- Unquantified recommendations are labelled investigations or data gaps.
- MACC values are generated only when reduction and economic inputs exist.
- The initial MACC annualizes capex using a disclosed 10-year planning assumption and subtracts annual savings.
- Net-zero pathways are transparent trajectories, not predictions.
- Supplier scores measure submitted data provenance and engagement, not sustainability performance.
- The internal readiness score is not assurance, an ESG rating, regulatory compliance or an investment opinion.
- The platform never recommends a credit purchase quantity automatically.

## Data model

| Table | Purpose |
| --- | --- |
| `sustainability_targets` | Carbon, energy, renewable, water, waste and net-zero targets |
| `net_zero_pathways` | Transition pathway assumptions and endpoints |
| `pathway_milestones` | Annual pathway milestones and status |
| `supplier_sustainability_assessments` | Supplier provenance and engagement inputs |
| `sustainability_plan_snapshots` | Immutable planner, MACC, readiness and residual-plan snapshots |

## API

| Method and route | Purpose |
| --- | --- |
| `GET /api/sustainability/summary` | Build tenant planning, targets, MACC, resources, suppliers and residual context |
| `POST /api/sustainability/targets` | Create a governed target |
| `POST /api/sustainability/pathways` | Create a validated net-zero pathway |
| `POST /api/sustainability/suppliers` | Create or update a supplier assessment |

## Access control

- `sustainability.view` permits planning reads.
- `sustainability.manage` permits target, pathway and supplier changes.
- Professional and Enterprise receive Sustainability Intelligence.
- Supplier Sustainability is initially Enterprise-only.
- Every query and write is constrained to the authorized organisation.

## Verification

- `npm run test:sustainability` validates MACC, pathway endpoints, supplier score semantics and bounded target progress.
- `npm run lint` validates TypeScript.
- `npm run build` validates the production frontend and API bundle.
