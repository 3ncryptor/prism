## QA Report: Feature #24 — CSV Export

### Acceptance criteria
- [x] Export produces exactly the columns from buildPlan.md §89, in order — PASS (evidence: live `fetch` against `/api/admin/jobs/:id/export` returned header row `student_name,student_id,score,confidence,bucket,skills_score,experience_score,projects_score,education_score,missing_requirements`)
- [x] Export contains real scored data for every result in the run, including ineligible/low-fit ones — PASS (evidence: response included all 3 seeded students — Student Three BEST_FIT 90.89, Student One and Two both LOW_FIT 30.00 with their real missing requirements)
- [x] No internal model prompts or per-requirement evidence text is exported — PASS (`resultsToCsv` only reads `studentName/studentId/score/confidence/bucket/categoryScores/missingRequirements`; `evidence` and any prompt/model-version fields are never touched)
- [x] CSV fields are properly escaped (commas, quotes, newlines) — PASS (unit tests: comma in a name is quoted, embedded quotes are doubled, RFC 4180 style)
- [x] Response has correct `Content-Type`/`Content-Disposition` for a file download — PASS (evidence: live response had `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="match-results-<jobId>.csv"`)
- [x] Unauthenticated/non-admin access is rejected — PASS (route calls `requireRole("ADMIN")`, consistent with all other `/api/admin/jobs/:id/*` routes)
- [x] Missing run/job returns 404, not a broken CSV — PASS (route mirrors the existing `results/route.ts`'s not-found handling exactly)

### Test suite results
- Backend: **6 new unit tests** for `resultsToCsv` (`tests/unit/services/csvExportService.test.ts`) — header format, single-row formatting, semicolon-joined missing requirements, comma escaping, embedded-quote escaping, multi-row ordering. All pass. This is the deterministic/pure-logic case AGENTS.md Cross-Cutting Rule 4 calls for full coverage on.
- Full suite: `npm test` → 151/152 passing; the one failure (`tests/integration/extraction/geminiExtractionProvider.test.ts`) is a pre-existing, known external constraint (Gemini free-tier daily quota exhausted against the live API) — unrelated to this feature, not a regression.
- Lint/typecheck/build: **PASS** — `npm run typecheck`, `npm run lint`, `npm run build` all clean; build confirmed `/api/admin/jobs/[id]/export` registered.

### Scope creep found
- None. Built exactly the export surface buildPlan.md §89 specifies — no additional columns, no new repository capability beyond what `results/route.ts` already used.

### Security/sanity pass
- Route gates on `requireRole("ADMIN")` before any DB access.
- No secrets, prompts, or debug output in the export.
- CSV injection (formula injection via `=`, `+`, `-`, `@` prefixes in a spreadsheet) was considered: all exported fields are either numeric (scores) or short human-authored strings (names, requirement labels drawn from the skill taxonomy / requirement text) — not raw untrusted user input rendered as-is elsewhere without validation, so this was judged out of scope for a V1 admin-only export tool; flagged here for awareness rather than treated as a blocking finding.

### Verdict
PASS — ready to commit
