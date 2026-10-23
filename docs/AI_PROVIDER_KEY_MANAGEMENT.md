# Multi-AI Provider Configuration — NOTES

Status: implementation contract; **not yet active in production**. Owner: Organization Admin; route planned: `/admin/ai-providers`.

## UX acceptance
Administration → AI Providers & API Keys. Responsive layout desktop/Android. Two independent ordered provider lists: **Transcription (STT)** and **Meeting intelligence (LLM)**; model availability must be capability-checked rather than assumed. Seed priority (editable, not hardcoded): LLM **OpenRouter → Groq → Google Gemini → OpenAI → Anthropic Claude → Cloudflare Workers AI**. STT priority **Groq Whisper → OpenAI audio transcription → Google speech/transcription service → other verified STT integration**. Each provider row: toggle active, priority integer & reorder arrows, model selector, masked API key input (password type), Save/Replace, Revoke, Test Connection, last test status/time, quota/budget, usage/cost, retry/fallback enabled. Empty key must never be mistaken for configured key. Never return full stored key to browser; show only "configured/not configured" and optional last four characters.

**Parity with INDIA/GreenCal:** same user interaction pattern of ordered providers, health testing, priority control and automatic fallback. Exact provider order in those systems has not been verified against their repositories; do not claim byte-for-byte parity until compared.

## Architecture and security gates
- Implement backend endpoints `GET /api/admin/ai-providers`, `PUT /api/admin/ai-providers/:provider`, `POST /api/admin/ai-providers/:provider/test`, `DELETE /api/admin/ai-providers/:provider/key`, `PUT /api/admin/ai-providers/order`, with an authenticated Organization Admin session, CSRF protection where applicable, strict organization-scoped authorization and server-side validation.
- For Cloudflare Workers, encrypt per-organization credentials using an encryption key stored as a **Cloudflare secret**; store only authenticated-encrypted ciphertext, nonce and key_version in D1 (never plaintext or a decrypting key). Use Web Crypto AES-GCM 256 with unique IV and authenticated associated data including organization_id, provider, purpose and version; rotate keys with an audited re-encryption procedure. Platform-global credentials may instead be provisioned as server-side platform secrets; do not expose them in UI.
- D1 tables proposed: `ai_provider_configs(id, organization_id, provider, purpose, enabled, priority, model, has_key, encrypted_key, key_nonce, key_version, status, last_test_at, updated_by, updated_at)`; unique (organization_id, purpose, provider), indexed ordered active list. Separate `ai_provider_usage` and immutable `ai_provider_audit`, with no raw requests/prompts or secrets in logs.
- Routing: choose active and healthy provider by ascending priority for each purpose, enforce model capability, data residency/privacy rules, budget, timeout and max retry. Fallback only on retryable errors (timeouts, rate limit, temporary upstream error); never fallback on access-denied, invalid consent, policy failure or wrong credentials without surfacing configuration error. STT and LLM routing must remain distinct.
- Test Connection is a server-side minimal API call with bounded cost and a timeout. Return sanitized results, rate limit the test endpoint and log only metadata.
- Secret change must be auditable but never log key value; allow admin to revoke/rotate. Role-specific least privilege and cross-tenant test required.
- The **same API key must not automatically be shared across different organizations**, and a provider endpoint URL must be allowlisted to prevent SSRF.
- Do not send confidential recordings/transcripts to any provider without the configured organizational processing policy and appropriate consent/legal basis.

## Release gates
1. Admin can add/rotate/revoke provider key; non-admin and other tenant cannot read or update.
2. Database stores encrypted key only; responses, HTML, browser state, logs, analytics and error traces never reveal it.
3. Priority reorder survives reload, routes requests in saved order, and STT/LLM use separate chains.
4. Test Connection verifies a real credential in isolated UAT, without publishing its value.
5. Simulate 429/5xx timeout fallback; verify no fallback for 401/403 or privacy violations.
6. Real provider STT/transcript and MoM generation are exercised with consented test audio.
7. Desktop/Android UI, monitoring, rollback, backup–restore and security review PASS before production.
