## Task: Features 22-27 (Admin dashboard through Observability)

Per explicit user instruction ("go from feature number 22 to 27, commit
after each feature"). Unlike the earlier 14-21/9-13 batches, this spec is
consolidated for shared context, but **each feature below gets its own
commit** after its own build+lint+typecheck+test verification — no
batching multiple features into one commit this time.

Design is fully specified in `buildPlan.md` §80-89, §113.2/§113.3, §116 and
`docs/BACKEND_ARCHITECTURE.md` §0.6/§8. This spec is a build-tracking index
against that design.

### 22. Admin dashboard
`/admin` (job list + JD upload) and `/admin/jobs/[id]` (job detail: bucket
counts, result table — Rank/Student/Score/Confidence/Bucket/Skills/
Experience/Projects/Missing requirements per §85 — "Run Matching" button).
Re-running matching reuses the existing `POST /api/admin/jobs/:id/match`
endpoint (creates a new `MatchRun` either way; buildPlan.md doesn't specify
a materially different `/rematch` contract beyond "don't change
`publishedMatchRunId`", which is naturally already true since nothing
publishes automatically). First real Grauity integration for an admin-role
page — extracts a reusable `withClientOnlyGrauity` helper (Feature #10's
per-page `ClientOnlyDashboard` pattern generalized, since every future
Grauity page hits the same SSR hydration gap).

### 22a. Publish/hide match results
`POST /api/admin/jobs/:id/publish-results` (body `{matchRunId}`),
`POST /api/admin/jobs/:id/hide-results` — flips `jobs.publishedMatchRunId`/
`publishedAt` (fields already exist on the `Job` schema from feature #3).
Student-facing `GET /api/matches` — only returns a result when
`result.matchRunId === job.publishedMatchRunId`; per §0.6, an unpublished
job the student has *any* result for still shows as "Under review", not
absent entirely. Admin dashboard shows publish state + toggle; student
dashboard gets an "Applications" section (§86).

### 22b. Skill Taxonomy admin UI
`GET/POST /api/admin/skill-taxonomy`, `PATCH /api/admin/skill-taxonomy/:id`
(edit or deactivate — soft-delete only, per §116). Extends
`skillTaxonomyRepository` with `list(activeOnly?)`, `update`, `deactivate`,
and a usage-count lookup (profiles/JDs referencing a canonical skill).
Admin-only page: table + create/edit form.

### 22c. Scoring Config admin UI
`GET/POST /api/admin/scoring-configs`,
`POST /api/admin/scoring-configs/:id/activate`. Extends
`scoringConfigService` with weight-sum validation (1.0 ± 0.01). Admin-only
page: active config + version history + "create new version" (pre-filled)
+ activate action. Activating never mutates or retroactively affects past
match runs (§46, already true by construction — `MatchRun` pins a version
string at creation).

### 23. Evidence UI
Per-result expandable detail (§85: "avoid a giant explanation in the
table... keep it one click away") showing the full `MatchResult.evidence[]`
breakdown, on both the admin result table (any result) and the student
dashboard (their own published result only).

### 24. CSV export
`GET /api/admin/jobs/:id/export` — exact column set from §89
(student_name, student_id, score, confidence, bucket, skills_score,
experience_score, projects_score, education_score, missing_requirements).
Never exports evidence text or prompts (§89: "do not export sensitive
internal model prompts"). "Export CSV" button on the admin job detail page.

### 25. Evaluation harness
`scripts/evaluate.ts` + `tests/evaluation/{resumes,jobs,labels}` fixture
convention per §78. No real labeled dataset exists (buildPlan.md §67-68's
"100 students × 20 JDs" dataset requires placement-staff labeling this
project doesn't have) — this feature builds the **tool and fixture
format**, illustrated with a small synthetic fixture, not a production-
scale evaluation run. Computes bucket accuracy / confusion matrix against
labels; does not train anything (§69 — explicitly not V1 scope).

### 26. Security
Audit + fix pass across the existing codebase, per §80-83:
- Rate limiting on resume/JD upload and match-trigger endpoints
  (Redis-backed, reusing the existing `ioredis` connection).
- `AuditService`/`auditLogRepository` (sketched in
  `docs/BACKEND_ARCHITECTURE.md`'s file tree, not yet built) — records
  admin actions (JD upload, match trigger, publish/hide, taxonomy/config
  edits).
- Verify S3 file access is via signed/private URLs, not public — audit
  `lib/storage/s3Client.ts`.
- File validation hardening: verify actual file structure (PDF/DOCX magic
  bytes), not just trusting the declared MIME type/extension (§82).
- Confirm no student can read another student's data by ID substitution
  (§80) — audit every student-facing route.

### 27. Observability
Structured logging with request/job correlation IDs across worker
pipelines and API routes (§79): resume/JD/matching latency, LLM
latency/failure rate, embedding latency, vector-store latency, queue
depth, worker failures. Builds on the existing Pino logger — no new
external APM/metrics service (none provisioned/requested).

### Explicit scope boundaries
- No LLM reranker, no learned ranking model (§65/§69 — explicitly not V1).
- Evaluation harness ships as a tool + tiny illustrative fixture, not a
  real accuracy benchmark (no real labeled data exists to benchmark
  against).
- Security/Observability are audit-and-harden passes over existing code,
  not new user-facing features — verified via code review + targeted
  tests, not a fresh UI.

### Testing policy for this batch
Deterministic backend logic (CSV formatting, weight-sum validation, rate
limiter logic, evaluation scoring) gets real unit tests, consistent with
the project's standing policy. UI states (loading/error/empty) get manual
verification via live browser testing per the "test in a browser before
reporting complete" rule, not exhaustive component test suites.
