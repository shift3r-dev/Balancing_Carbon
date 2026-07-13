# Phase 14: Marketplace and Integrations

## Purpose

Phase 14 adds a declarative marketplace and a secured developer-integration foundation. It deliberately does not execute third-party plugin code, contact preview connector vendors, connect hosted AI APIs, or deliver outbound webhooks.

## Capabilities

- Catalog for industry packs, report templates, widgets, factor packs, connector definitions, local AI profiles, and future plugins
- Organisation-scoped install, reinstall, and uninstall lifecycle
- Package version and preview-state tracking
- Scoped developer API credentials shown once and stored only as SHA-256 hashes
- API-key revocation, expiry, last-use timestamp, entitlement enforcement, and 60-request/minute ceiling
- Webhook definitions with HTTPS validation and one-time signing secrets
- Webhook delivery-history schema for a future worker
- OpenAPI 3.1 contract at `/api/developer/openapi`
- First scoped API route: `GET /api/developer/v1/carbon-summary`
- Developer API usage audit records

## Deployment

1. Apply `server/migrations/030_marketplace_integrations.sql` after migration `029`.
2. Restart the application.
3. Professional and Enterprise plans can open **System > Marketplace** and install declarative catalog packages.
4. Enterprise organisations can create developer credentials and paused webhook definitions.

## Developer API

Create a credential with `carbon.read`, then call:

```bash
curl -H "x-api-key: bc_live_REPLACE_ONCE_ONLY_SECRET" \
  https://your-host/api/developer/v1/carbon-summary
```

The key is resolved by hash, checked against the current licence and `integration.developer_api` entitlement, checked for expiry and scope, rate-limited, and audited before tenant data is returned.

## Security Boundaries

- Marketplace manifests are sanitized and forced to `executesCode: false`.
- Installing connector definitions does not create a live Data Hub connection or save vendor credentials.
- API keys are returned only once; only their SHA-256 hashes and prefixes are persisted.
- Webhook endpoint URLs must use HTTPS and cannot include embedded credentials.
- Webhooks remain paused because a secure worker must retain an encrypted signing secret to deliver signed requests.
- The Qwen marketplace profile references local Ollama only. Hosted AI APIs remain disconnected.
- Factor-pack installation never approves or applies emission factors automatically.

## Future Production Work

- Persistent distributed rate limiting for horizontally scaled deployments
- Encrypted secret vault and rotation workflow
- Webhook queue worker with HMAC signatures, retry/backoff, replay protection, and dead-letter handling
- Vendor-specific connector adapters after contracts and credentials exist
- Generated TypeScript/Python SDKs from the OpenAPI contract
- Package signing, publisher verification, malware review, and commercial settlement before third-party marketplace submissions

## Verification

```powershell
npm run lint
npm run test:marketplace
npm run build
```
