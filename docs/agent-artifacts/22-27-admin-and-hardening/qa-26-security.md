## QA Report: Feature #26 — Security

### Scope note (read first)
A research fork audited the codebase against buildPlan.md §80-83 before implementation (full findings retained in session history). Result: authenticated access, role-based authorization, per-student data scoping, file size limits, and MIME-based file type checks were **already solid** and needed no further work. Encryption in transit/at rest and least-privilege DB access are infrastructure/deployment concerns, not app-code deliverables — flagged below as a deployment checklist, not built. The three genuinely missing, in-scope items were built: **rate limiting**, **magic-byte file validation**, and a **minimal audit log**.

### Acceptance criteria
- [x] Resume upload is rate-limited (buildPlan §83) — PASS (evidence: live fetch loop as student2 — 5 uploads returned 200, 6th and 7th returned 429 with `Retry-After: 597`)
- [x] JD upload is rate-limited — PASS (`RATE_LIMITS.jdUpload`, 20/hour per admin, wired into `POST /api/admin/jobs`)
- [x] Matching run trigger is rate-limited ("should not be triggerable repeatedly without authorization" per §83) — PASS (`RATE_LIMITS.matchRun`, 10/minute per admin, wired into `POST /api/admin/jobs/:id/match`)
- [x] Rate limiter is Redis-backed, reusing existing infra (no new services) — PASS (`lib/services/rateLimitService.ts` uses `getRedisConnection()` from `lib/queue/connection.ts`, the same connection BullMQ already holds open)
- [x] File type is validated by actual content, not just MIME/extension (buildPlan §82's explicit "do not trust... alone") — PASS (live test: a text file with `Content-Type: application/pdf` was rejected with 400 "Only PDF and DOCX resumes are accepted."; unit tests cover real PDF/DOCX signatures, mismatched signatures, and short buffers)
- [x] Sensitive admin actions are audit-logged (JD upload, matching run, publish/hide results, skill taxonomy and scoring config mutations) — PASS (8 call sites across 6 route files; live-verified `RESULTS_HIDDEN`/`RESULTS_PUBLISHED` entries in MongoDB with correct `actorId`/`actorRole`/`action`/`targetType`/`targetId`/`metadata`)
- [x] Audit logging failures never block the primary action — PASS (`recordAuditLog` catches and logs via the structured logger, never throws)
- [x] Rate-limit and file-validation rejections return clear, correctly-coded HTTP responses — PASS (429 with `Retry-After` header for rate limits; 400 for invalid file signatures)

### Test suite results
- **7 new unit tests** for `matchesFileSignature` (`tests/unit/services/fileSignatureValidator.test.ts`) — real PDF/DOCX signatures, mismatched signatures, short buffers.
- **4 new integration tests** for `checkRateLimit` against a real Redis container (`tests/integration/services/rateLimitService.docker.test.ts`, following this repo's existing `redisContainer.ts` pattern) — limit enforcement, TTL is set, independent keys, positive `retryAfterSeconds`.
- Fixed one pre-existing unit test (`tests/unit/services/resumeService.test.ts`'s "accepts a DOCX file") whose fixture buffer never had real DOCX magic bytes — the new validation correctly caught this; the test now uses a real ZIP-signature buffer.
- Full suite: `npm test` → 162/163 passing; the one failure (`geminiExtractionProvider.test.ts`) is the same pre-existing, unrelated Gemini free-tier quota exhaustion seen in every prior feature this session — not a regression.
- Lint/typecheck/build: **PASS** — all clean; no new routes (all wiring was into existing route files), so no route-type regeneration needed.

### Scope creep found
- None. Did not build: audit-log admin UI (not requested, no acceptance criterion for it — `auditLogRepository.listRecent()` exists for a future UI without an HTTP surface); the existing but unused `getPresignedDownloadUrl()` in `lib/storage/s3Client.ts` was left as-is (harmless dead code — no route exposes a public/permanent URL either way, and wiring it up would require a new "admin views original file" feature not currently in scope).

### Explicitly out of app-code scope (deployment checklist, not built)
- **Encryption in transit**: TLS termination is a hosting/reverse-proxy concern.
- **Encryption at rest**: S3/MongoDB storage-engine configuration, not application code.
- **Least-privilege DB access**: `docker-compose.yml` runs Mongo with no auth for local dev (standard default); the app already reads any connection string via `MONGODB_URI`, so swapping to a scoped-user credential in a real deployment is a config change, not a code change.

### Security/sanity pass
- All 8 new audit-log call sites gate on `requireRole("ADMIN")` before the audited action runs.
- Rate limit keys are scoped per-actor (`${action}:${userId}`), so one user's usage never affects another's limit.
- No secrets or debug output introduced.

### Verdict
PASS — ready to commit
