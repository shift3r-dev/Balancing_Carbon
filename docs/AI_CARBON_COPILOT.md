# Phase 8 - AI Carbon Copilot

## Status

Phase 8 provides a provider-neutral, read-only Carbon Copilot. It supports hosted Google Gemini and optional local Ollama while preserving the same tenant grounding, citations, usage logging, and no-write boundary.

## Deployment

1. Apply `server/migrations/022_ai_carbon_copilot.sql` after migration `021`.
2. Apply `server/migrations/023_governed_document_grounding.sql` after migration `022`.
3. Choose one provider and configure `.env`.

Local Ollama:

```env
AI_ENABLED=true
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
OLLAMA_CONTEXT_LENGTH=8192
AI_TIMEOUT_MS=120000
AI_ALLOW_EXTERNAL=false
SUPABASE_STORAGE_BUCKET=evidence
```

Hosted Google Gemini:

```env
AI_ENABLED=true
AI_PROVIDER=gemini
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_MODEL=gemini-3.5-flash
GEMINI_API_KEY=your-server-side-key
AI_TIMEOUT_MS=120000
AI_ALLOW_EXTERNAL=true
SUPABASE_STORAGE_BUCKET=evidence
```

4. For Ollama, install and run the configured model: `ollama run qwen3:8b`.
5. Restart or redeploy the Balancing Carbon server.

## Security and calculation boundaries

- Authentication and `ai.use` permission are required.
- Conversations are restricted by organisation and creator.
- The context assembler applies `organisation_id` filters to every query.
- The model receives no Supabase key, access token, database connection, write API, or tool execution capability.
- Tenant data is marked as untrusted content and cannot override the system instruction.
- Carbon calculations remain exclusively in the deterministic accounting engine.
- The model may explain recorded calculations but cannot create or modify activity, factors, reports, projects, or evidence.
- Responses cite a bounded catalog of facilities, energy records, reports, documents, and projects.
- Provider/model, latency, token counts, outcome, and citation count are written to `ai_usage_events`.
- Provider credentials are read only by the server and must never use the `VITE_` prefix.

## API index

| Endpoint | Purpose |
| --- | --- |
| `GET /api/ai/status` | Configured provider and model health |
| `GET /api/ai/conversations` | Current user's conversation list |
| `GET /api/ai/conversations/:id` | Load an owned conversation |
| `DELETE /api/ai/conversations/:id` | Archive an owned conversation |
| `POST /api/ai/chat` | Grounded Copilot response and conversation persistence |
| `POST /api/ai/chat/stream` | Cancellable NDJSON progress stream and final grounded response |
| `GET /api/ai/usage?days=30` | Organisation usage summary for users with `audit.view` |

## Grounded context

The read-only snapshot includes organisation profile, facility summaries, recent energy and production records, ESG responses, reduction opportunities, decarbonization projects, reports, evidence-document metadata, and question-relevant extracted evidence chunks. Limits are applied to each dataset to control latency and context size.

## Governed evidence grounding

- The Evidence Document Vault accepts PDF, DOCX, TXT, CSV, Markdown, and JSON files up to 10 MB.
- Browser MIME type and server-side file signatures are both checked.
- Files are stored under organisation/document-specific paths in the private `evidence` Supabase Storage bucket.
- SHA-256, MIME type, byte size, storage path, extraction status, and extraction timestamp are retained on the document record.
- Extracted text is normalized and split into bounded, overlapping chunks. Original binary content is never inserted into the prompt.
- Question terms rank tenant-owned chunks; at most eight excerpts enter a Copilot request.
- Evidence excerpt citations use `X` identifiers and navigate back to the Documents module.
- Downloads use 60-second signed URLs generated only after tenant ownership checks.
- Deleting a document removes its private storage object, metadata, and cascaded text chunks.

## Interaction and oversight

- The chat stream reports context-loading and provider-generation phases before returning the persisted answer.
- Users may cancel an in-progress request; the provider HTTP request is aborted and a failed/cancelled usage event is retained.
- Citation controls navigate to the corresponding Facilities, Energy, Reports, Documents, or Carbon Intelligence module.
- Users with `audit.view` see a 30-day summary of requests, failures, average duration, and token counts. Prompt and response text are not exposed in this analytics summary.

## Current boundaries

- Ollama must be reachable from the backend host. A production server cannot call the Ollama instance on a developer laptop unless it is deployed on an accessible private host.
- Gemini sends the bounded tenant context to Google's Gemini API. Enable it only after the organisation's data-processing and privacy requirements are accepted.
- Free-tier Gemini prompts may be used to improve Google's products. Use a paid tier for production data when contractual privacy requirements demand it.
- Hosted model IDs can be deprecated; monitor Google's model lifecycle and update `GEMINI_MODEL` when necessary.
- The Copilot does not browse the internet and must not be treated as a regulatory authority.
- Source citations show which stored records supported the answer; they do not replace assurance review.
- Scanned image-only PDFs require OCR, which is not included in this local text-extraction phase; these files may produce an `empty` extraction status.
