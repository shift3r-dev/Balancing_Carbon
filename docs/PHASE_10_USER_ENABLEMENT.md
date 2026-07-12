# Phase 10 - User Enablement and Product Adoption

## Purpose

Balancing Carbon now teaches workflows inside the product instead of expecting users to study the full platform before starting. Guidance is role aware, task based, and tied to actual tenant records.

## Delivered experience

- First-run welcome that explains the user role and recommends the first incomplete task.
- Role-aware implementation checklist for administrators, sustainability managers, operators and auditors.
- Completion derived from organisation, facility, activity, production, evidence, project, member and report records.
- Compact progress widget on the Command Center.
- Contextual Help drawer for the current workspace.
- Guided walkthroughs for platform essentials, data ingestion, ESG reporting and auditor review.
- Searchable Learning Centre covering carbon accounting, units, imports, evidence, intelligence, reporting, AI safety, roles and troubleshooting.
- User-specific tour, guide and preference state synchronized through Supabase.

## Data model

`user_enablement_progress` stores only personal learning state:

- `item_key` identifies a task, tour, guide or preference.
- `item_type` distinguishes the learning object.
- `status` is `started`, `completed` or `dismissed`.
- `metadata` is reserved for non-sensitive presentation state.
- Tenant and user identifiers enforce ownership.

Operational completion is not copied into this table. For example, facility setup is complete only when an active facility exists in the organisation.

## API

| Method and route | Purpose |
| --- | --- |
| `GET /api/enablement/summary` | Return role, permissions, live completion signals and personal progress |
| `PUT /api/enablement/progress/:key` | Save an allow-listed task, tour, guide or preference state |

## Security

- Both endpoints require authentication.
- Summary queries are constrained to the authorized organisation.
- Progress writes always use the authenticated user and organisation; client-supplied ownership is ignored.
- Item keys and state values are allow-listed.
- RLS permits authenticated users to read and update only their own progress rows.
- Learning state never changes ledger, evidence, calculation, approval or report data.

## Product behavior

- Administrators see organisation, team and platform setup tasks.
- Sustainability managers see accounting, intelligence, evidence and reporting tasks.
- Operators focus on facility-scoped activity, production and evidence collection.
- Auditors receive read-oriented evidence and reporting guidance.
- Manual learning acknowledgements are explicitly labelled; operational tasks remain record derived.

## Deployment

Run `server/migrations/025_user_enablement_layer.sql` after migration 024. Restart the API after deployment. No environment variables or external training service are required.

## Verification

- Run `npm run lint`.
- Run all domain test scripts.
- Run `npm run build`.
- Sign in as each supported role and verify that the checklist differs appropriately.
- Confirm that adding a facility, activity, production record, document, project or report updates progress after refresh.
