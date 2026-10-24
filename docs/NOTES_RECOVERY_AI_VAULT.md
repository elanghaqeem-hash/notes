# NOTES Recovery: AI API Key Vault & Provider Test

## Release 2026-10-24

Live Worker: `notes-recovery` on the `elang-haqeem.workers.dev` subdomain. Source snapshot is in `workers/notes-recovery/index.js`; deployed through Cloudflare Workers API, and not currently built from Next.js `main`.

### Operator controls
- **Simpan API Key (Terenkripsi)**: saves entered OpenAI, OpenRouter, Groq, and Mistral keys to *encrypted browser localStorage*, using AES-256-GCM with a random 96-bit IV, 128-bit salt, and PBKDF2-SHA-256 (250,000 iterations). Requires a separate passphrase of at least 12 characters. The passphrase is never persisted.
- **Buka API Key Tersimpan**: decrypts the vault using the same passphrase after refresh or a new browser session, only on the same browser/device.
- **Test API AI — Provider Aktif**: calls the existing Worker endpoint `POST /api/test`, which performs a real `GET /models` request to the selected provider, with a user-entered key.
- **Test Semua API AI**: tests only providers with entered/unlocked keys, one by one, displaying separate success/error results.
- **Hapus Semua Key**: requires confirmation and removes both form values and the encrypted vault.

### Security limits
- Keys are **not stored centrally** in Notes, Cloudflare D1, KV, Worker secrets or GitHub. The existing app has no admin identity/RBAC or server-side encrypted provider vault; adding such storage without authentication would expose organization credentials.
- Encrypted localStorage mitigates at-rest leakage, but cannot protect a device against malware, malicious extensions or script compromise while keys are unlocked. Avoid shared devices.
- The Worker still accepts API keys for the current request in an `x-ai-key` HTTPS header. Responses should not reveal raw credentials; check logs and operational data policies before enterprise use.
- Using a key to test against a real provider requires a valid provider account and may incur provider costs/limits. No live keys have been provided during development.

### Release and UAT
- Cloudflare UAT Worker: `notes-recovery-uat`.
- Deploy and exact-source verification: PASS on 2026-10-24; the UAT and production Worker source match.
- Cloudflare automatic production deployment version: `15c0a174-b7f2-450f-a79c-d53aaf9e2bc4`.
- Rollback target (previous production version): `03ee7bdf-4a87-4b0a-a3b3-e071afa2b5b0`.
- Still required to close release gate: browser UAT on Android and desktop (save → refresh → unlock, wrong password, delete and recheck) and real credentials for each provider (401/429/5xx plus success); tool environment could not reach workers.dev for direct HTTP check.

### Future improvement
Implement a server-side encrypted D1 vault with Cloudflare Access / org RBAC, per-tenant isolation, rotation and audit trail; migrate stored browser keys only after explicit user consent.