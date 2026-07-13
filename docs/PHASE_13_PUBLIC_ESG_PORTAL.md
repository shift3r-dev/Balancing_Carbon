# Phase 13: Public ESG Portal

## Purpose

Phase 13 gives Enterprise organisations a controlled external disclosure portal. It does not expose live tenant tables. Every publication creates a versioned JSON snapshot containing only approved aggregates, approved targets/pathways, selected resource metadata, and manually curated public statements.

## Capabilities

- Public organisation identity and ESG summary
- Aggregate Scope 1 and Scope 2 carbon dashboard
- Approved ESG indicator statistics
- Approved/active sustainability targets and progress
- Approved/active net-zero pathway metadata
- Climate commitments, policies, and certificate statements
- Selected report and document metadata
- Aggregate supplier engagement without supplier identities or commercial data
- Investor-oriented snapshot and methodology disclosures
- Draft, publish, withdraw, and republish lifecycle
- Unique public route at `/portal/{slug}`

## Deployment

1. Apply `server/migrations/029_public_esg_portal.sql` after migration `028`.
2. Restart the application server.
3. Sign in to an Enterprise organisation with organisation administrator or sustainability manager permissions.
4. Open **Reporting & Evidence > Public ESG Portal**.
5. Save identity, sections, statements, and selected resources.
6. Publish the first snapshot and test `/portal/{slug}` in a signed-out browser.

## Publication Boundary

- Carbon values come from current calculation records and are aggregated by scope.
- ESG statistics include only questions whose review status is `Approved`.
- Targets and pathways include only approved, active, or achieved records.
- Supplier publication is aggregate-only. Names, spend, notes, evidence IDs, and reported supplier emissions are omitted.
- Selected reports/documents expose title and summary metadata only. Private files and storage URLs are never copied into the snapshot.
- Public pages disclose snapshot time, reporting period, calculation boundary, and assurance limitations.

## Security

- Portal administration requires `public_portal.view`, `public_portal.manage`, or `public_portal.publish` as appropriate.
- Administration requires the Enterprise `public.portal` entitlement.
- All management queries are organisation-scoped.
- The only anonymous endpoint reads a portal with `status = published` and returns `published_snapshot`.
- Withdrawing a portal immediately removes anonymous access while retaining publication history.

## Verification

```powershell
npm run lint
npm run test:portal
npm run build
```
