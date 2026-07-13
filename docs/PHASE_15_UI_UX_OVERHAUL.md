# Phase 15 - Enterprise UI and UX Overhaul

## Status

Phase 15 is complete as a compatibility-safe presentation and navigation upgrade. It does not change carbon calculations, database schemas, API contracts, authentication, permissions, entitlements, or reporting methodology. No SQL migration is required.

## Delivered

- A unified enterprise surface system for cards, forms, controls, tables, focus states, spacing, shadows, disabled states, selection, and scroll behavior.
- A searchable, grouped dashboard navigation with live organisation identity instead of demonstration tenant text.
- A responsive off-canvas dashboard drawer that replaces the previous mobile navigation strip.
- A compact workspace top bar with module title, section context, organisation context, Help, and Carbon Copilot access.
- Consistent responsive behavior for dense grids, action rows, large panels, tables, and report canvases.
- Touch targets and keyboard-visible focus treatment across the public website and authenticated application.
- Reduced-motion support for users who disable animation at operating-system level.
- Route-level lazy loading retained for large workspace modules.
- Public header, homepage, mobile menu, and authentication portal responsive verification.

## Responsive Contract

| Width | Navigation | Workspace behavior |
| --- | --- | --- |
| Above 900px | Persistent collapsible sidebar | Dense multi-column layouts remain available |
| 641-900px | Off-canvas drawer | Sticky compact top bar and adaptive grids |
| Up to 640px | Off-canvas drawer | Single-column content, wrapped actions, contained wide tables |

Wide operational tables remain horizontally scrollable because collapsing their columns would hide audit-relevant data. The page itself must not scroll horizontally.

## Accessibility Contract

- Interactive controls expose visible keyboard focus.
- Icon-only navigation controls have accessible names.
- Dashboard navigation is represented as a labelled landmark.
- Motion is effectively disabled when `prefers-reduced-motion` is enabled.
- Mobile navigation includes a dismissible backdrop and explicit close control.
- Form controls preserve native semantics and minimum usable heights.

## Verification

- `npm run lint`
- Full `tsx --test` server test suite
- `npm run build`
- Browser checks at 1440x900 and 390x844
- Public homepage, mobile navigation, and client login portal checked for overflow and control clipping

## Follow-up Boundary

Future UI work should extend the shared tokens and shell rather than adding isolated page themes. Component decomposition of `src/App.tsx`, `EnterpriseDataHub`, and `ReportingWorkspace` remains engineering refactoring work and must preserve the Phase 15 visual and accessibility contracts.
