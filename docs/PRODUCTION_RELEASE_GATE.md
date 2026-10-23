# NOTES Production Release Gate — 2026-10-23

## Verified cloud snapshot
Cloudflare account `208155f241d4da84e1a6a9b44b7a8d28` has scripts `notes` and `notes-recovery`. The `notes` script settings returned **zero bindings**, and both scripts' secret listing returned **zero secrets** at inspection time. This means the new AI endpoints cannot yet use providers on these Workers.

## Required first deploy preparation
- Provision separate D1 UAT/prod databases, R2 private storage, Access applications/policies and Cloudflare Access audience/team domain. Never share access sessions or keys with other apps.
- Bind `DB` and `MEDIA` to Workers and verify real writes, reads, auth and restore rehearsals; current browser-local note storage does **not** meet server-persistence gate.
- Configure platform secrets `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, and at least one of `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, or `OPENAI_API_KEY`. These are server-only, not NEXT_PUBLIC variables.
- Verify that the deployed Next.js Worker forwards and validates `Cf-Access-Jwt-Assertion`, and that the Cloudflare Access policy protects all routes. Test missing/expired/foreign-audience tokens.
- Put rate-limit and size controls at edge for AI routes, do not expose secrets in logs, and enforce cost budgets. Before multitenancy, prohibit cross-organization sharing.
- Implement durable per-tenant API-key UI with encryption, admin RBAC, audit, and separate STT/LLM routing prior to marking this feature complete.
- Pin and review dependencies, run a clean lockfile install, static analysis, `npm run lint`, and `npm run build` in CI. Add end-to-end tests using consented audio.
- Deploy first to isolated UAT; verify the complete workflow and D1/R2 persistence, backup/restore, mobile/desktop behavior, user acceptance, rollback, and release approval before promoting the production Worker.
- Keep `notes-recovery` untouched until backup and rollback are confirmed.

## Important
PR #2 adds workspace and provider adapters but **is not a production-ready release**. No Cloudflare production deployment or real AI calls have been verified. Never merge automatically on an unverified status.
