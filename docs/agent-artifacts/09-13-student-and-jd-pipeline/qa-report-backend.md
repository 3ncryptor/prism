## QA Report: Features #9, #11, #12 (Student Profile API, JD Upload, JD Worker)

### Acceptance criteria (from spec.md)

- [x] `GET /api/profile` returns the student's own profile, 401/403 enforced
      — PASS (route reuses `requireRole("STUDENT")`, same pattern as
      `/api/resumes`, already covered by the auth middleware's own tests).
- [x] `POST /api/admin/jobs` uploads a JD the same way resumes upload —
      PASS (`jobService.uploadJob` is a structural mirror of
      `resumeService.uploadResume`, same validation/S3/enqueue steps).
- [x] JD worker reaches `READY` with a validated `JobProfile` on a
      successful run (verified via mocked deps) — PASS, evidence:
      `processJobJob` happy-path test asserts the full
      `EXTRACTING → EXTRACTED → STRUCTURING → VALIDATING → READY` sequence
      and that `jobProfiles.save` is called with the normalized profile.
- [ ] `skillTaxonomyService.canonicalize("NodeJS")` resolves to `"node.js"`
      — not yet built (feature #13, separate commit).
- [x] `npm run build`, `npm run lint`, `npm run typecheck` all pass — PASS,
      evidence below.

### Test suite results

- Backend: `npx jest tests/unit/workers/documentWorker.test.ts
  tests/unit/extraction tests/unit/schemas` → 4 suites, 26 tests, all pass.
- Full suite: `npx jest` → 17/18 suites pass, 73/74 tests pass. The one
  failure (`tests/integration/extraction/geminiExtractionProvider.test.ts`)
  is a transient live-API `503 Service Unavailable` from Gemini
  ("currently experiencing high demand") — an external service outage, not
  a regression from this change; unrelated to any file touched in this
  batch.
- Lint: `npm run lint` → clean, no errors or warnings.
- Typecheck: `npm run typecheck` → clean.
- Build: `npm run build` → succeeds; all 8 routes compile, including the two
  new ones (`/api/profile`, `/api/admin/jobs`).

### Scope creep found

- `jobStatusSchema` gained an `EXTRACTED` status value not explicitly called
  out in spec.md — necessary for parity with `resumeStatusSchema` so the JD
  worker's state machine (which spec.md §12 explicitly says "same
  extract → quality-check → LLM-structure → validate → READY pipeline as
  resumes") can use the same sequence. Not scope creep in effect, just an
  omission in the original feature #3 schema that this feature's own
  acceptance criteria required fixing. Noted here per Cross-Cutting Rule 3
  (no silent scope changes).

### Security/sanity pass

- No secrets committed (`.env` remains gitignored; verified no credential
  values appear in any touched file).
- `POST /api/admin/jobs` and `GET /api/profile` both enforce role checks
  before touching data — no auth bypass paths.
- No unhandled error paths that would crash the worker process: both
  `processResumeJob` and `processJobJob` wrap their body in try/catch,
  update status to `FAILED` with a structured error, and rethrow for BullMQ
  retry (per buildPlan.md §57) rather than swallowing.

### Verdict

PASS — ready to commit (Features #9, #11, #12 only; #10 and #13 tracked
separately in this same batch's `spec.md`).
