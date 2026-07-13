# Phase 12: Workflow and Collaboration

## Scope

Phase 12 adds organisation-scoped operational collaboration without allowing workflow actions to mutate carbon ledgers. It includes tasks, comments and mentions, notifications, activity history, review cycles, evidence requests, document approvals, overdue escalation, and a durable email outbox.

## Deployment

1. Apply `server/migrations/028_workflow_collaboration.sql` after migration `027` in the Supabase SQL editor.
2. Restart the application server.
3. Sign in with a Professional or Enterprise organisation. Starter does not include `collaboration.workflows`.
4. Open **Reporting & Evidence > Collaboration**.

## Operating Flow

1. A manager creates a task, review, evidence request, or document approval and assigns an active organisation member.
2. The assignee receives an in-app notification. An email message is also added to `collaboration_email_outbox`.
3. The assigned actor, or a workflow manager, progresses the record through its governed statuses.
4. Comments can mention active tenant members. Mentions create notifications and outbox messages.
5. Every important action appends a record to `collaboration_activity_feed`.
6. A manager can run overdue escalation. Open tasks past their due date are marked as escalated and their assignees are notified.

## Security Model

- Every query is filtered by the authenticated organisation ID.
- Create/manage operations require `collaboration.manage`.
- Decisions require `collaboration.review` and are restricted to the assigned actor unless the user also has `collaboration.manage`.
- Membership targets are validated against active profiles in the current organisation.
- The Supabase service role remains server-side; the browser never receives privileged credentials.

## Email Boundary

Email automation is intentionally queue-only. The platform records messages in `collaboration_email_outbox`, but no external email provider or delivery worker is configured. This preserves deterministic workflow behavior until deployment credentials and a transactional email service are selected.

## Verification

Run:

```powershell
npm run lint
npm run test:workflow
npm run build
```
