## QA Report: Feature #27 — Observability

### Scope note (read first)
A research fork audited the codebase against buildPlan.md §79 before implementation. Result: the Pino logger existed but was used almost nowhere (6 bare startup/shutdown log lines total), no latency or failure-rate tracking existed anywhere in the LLM/embedding/vector-store/matching pipeline, and no queue-depth or per-request-ID infrastructure existed. Per this project's established rule against building instrumentation that only looks meaningful under real production traffic, and given no APM/metrics backend exists in this stack, scope was limited to **structured logging only** — latency and failure tracking for the operations buildPlan §79 explicitly names, via `logger.child()` and one shared timing helper. A per-route request-ID for every simple CRUD API route, a queue-depth dashboard, and a `/api/metrics` endpoint were explicitly out of scope (the audit's own recommendation) — none of that is achievable without real traffic to make it meaningful, matching this project's existing evaluation-harness and audit-log-UI scope decisions.

### Acceptance criteria
- [x] Resume processing latency — PASS (`processResumeJob` wrapped in `withTiming` with `logger.child({jobId, studentId, jobType})`; live-verified: `resume.process completed` with real `durationMs`)
- [x] JD processing latency — PASS (`processJobJob` wrapped identically with `jobType: "JD_PROCESS"`)
- [x] LLM latency — PASS (`generateJson` in `geminiExtractionProvider.ts` wraps its call in `withTiming`, logging `{model, durationMs}`)
- [x] LLM failure rate — PASS (`generateContentWithRetry` logs a `logger.warn` with `{attempt, maxAttempts, err}` on every retryable failure, and the final unrecoverable failure surfaces through `withTiming`'s error log)
- [x] Embedding latency — PASS (`GeminiEmbeddingProvider.embed()` wraps its fetch in `withTiming`; live-verified: `embedding.batchEmbedContents completed` with `textCount: 5, durationMs: 1092` from a real match run)
- [x] Vector store (Pinecone) latency — PASS (`PineconeVectorStoreProvider.upsert()`/`.search()` wrapped at `debug` level to avoid flooding logs in the per-student-per-requirement hot loop; live-verified: 10 real `vectorstore.search completed` entries during one match run, `durationMs` ranging 292-3116ms)
- [x] Matching latency — PASS (`processMatchRun` wrapped in `withTiming`; live-verified: `matchRun.process completed` with real `jobId` (the MatchRun id) and `durationMs: 5005` for a full run against 3 students)
- [x] Worker failures — PASS (`.on("failed", ...)` added to both `startDocumentWorker()` and `startMatchingWorker()`, logging queue job id, job type, `attemptsMade`, and the error — a terminal-failure aggregate distinct from the per-document `FAILED` status the workers already persisted)
- [x] Every relevant log line carries request/job correlation (buildPlan's requestId/jobId/studentId) — PASS for the processing pipeline: every worker log uses `logger.child({jobId, studentId?, jobType})`, and per-operation logs (`gemini.generateContent`, `embedding.batchEmbedContents`, `vectorstore.*`) carry their own `operation`/context fields. Per-API-route `requestId` generation was explicitly descoped (see above).
- [x] Never logs full resumes or sensitive data — PASS (all new log fields are ids, counts, durations, and error objects — no resume/JD text, no PII, is ever passed to `withTiming`'s `extra` or a `logger.child()` binding)
- [x] Queue depth — explicitly out of scope (see scope note); `getJobCounts()` remains available ad hoc via BullMQ if ever needed.

### Test suite results
- **4 new unit tests** for `withTiming` (`tests/unit/observability/timing.test.ts`) — info-level success logging with `durationMs`, debug-level override, extra-fields passthrough, error-level logging + rethrow on failure.
- Full suite: `npm test` → 166/167 passing; the one failure (`geminiExtractionProvider.test.ts`) is the same pre-existing, unrelated Gemini free-tier quota exhaustion seen throughout this session — not a regression. Notably, this run's own test output *itself* printed a real `resume.process completed` structured log line from the Docker-backed worker integration test, independently confirming the instrumentation before any manual live testing.
- Lint/typecheck/build: **PASS** — all clean; no new routes, so no route-type regeneration needed.

### Live verification
Restarted the standalone worker process to load the new code, then triggered a real "Re-run Matching" from the admin UI (`/admin/jobs/6aa140b0b75f7df03a512756`) against real Gemini/Pinecone infrastructure:
- `embedding.batchEmbedContents completed` — `textCount: 5, durationMs: 1092`
- 10× `vectorstore.search completed` (debug level) — `namespace: "student-features", topK: 2`, durations 292-3116ms
- `matchRun.process completed` — real `jobId` (new MatchRun `6aa18e33b75f7df03a512769`), `durationMs: 5005`
No demo-state cleanup was needed: the new match run stayed unpublished by existing design (re-running never silently changes what students see), so the previously published run remained visible to students throughout.

### Scope creep found
- None beyond what's noted in the scope section above (which is a deliberate *reduction*, not creep).

### Security/sanity pass
- No new routes, no new data exposure.
- Confirmed no resume/JD body text, prompts, or PII appear in any new log call — only ids, counts, and durations.

### Verdict
PASS — ready to commit
