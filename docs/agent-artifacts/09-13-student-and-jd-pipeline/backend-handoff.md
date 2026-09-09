## Backend Handoff: Features #9, #11, #12 (Student Profile API, JD Upload, JD Worker)

Batched per user instruction ("complete 9-13, they are all similar"). Committed
together because they are one coherent backend slice — the JD worker (#12)
can't be verified without the JD upload flow (#11) that creates the `Job`
records it consumes, and both share the `nullish()` schema fix. Feature #10
(Student Dashboard) and #13 (Skill Taxonomy) are separate commits — #10 is
frontend-only work, #13 is a standalone domain concept.

### Endpoints/functions implemented

- `GET /api/profile` (`app/api/profile/route.ts`) → STUDENT-only. Returns the
  caller's active `StudentProfile` (or `null`) plus their active `Resume`
  status. 401 if unauthenticated, 403 if not a STUDENT.
- `POST /api/admin/jobs` (`app/api/admin/jobs/route.ts`) → ADMIN-only.
  Mirrors `POST /api/resumes` (feature #5): validates file type/size, uploads
  to S3, creates a `Job` record, enqueues `JD_PROCESS`. Returns the created
  `Job`.
- `GET /api/admin/jobs` → ADMIN-only. Lists jobs (`archived` query filter).
- `lib/services/jobService.ts`: `uploadJob()`, `listJobs()`,
  `InvalidFileTypeError`, `FileTooLargeError`, `MAX_JD_SIZE_BYTES` — mirrors
  `resumeService.ts`.
- `workers/document-worker.ts`: `processJobJob()` — mirrors
  `processResumeJob()`'s state machine (`EXTRACTING` → `EXTRACTED` →
  `STRUCTURING` → `VALIDATING` → `READY`, `FAILED` on any stage failure).
  Wired into the `Worker` callback's `JD_PROCESS` branch (previously
  stubbed as a no-op since feature #6).
- `ExtractionProvider.extractJD()` (new interface method) implemented in
  `GeminiExtractionProvider` via a shared `generateJson()` helper factored
  out of the existing `extractResume()`.
- `lib/extraction/prompts/jd-extraction-v1.ts` — new prompt.
- `lib/extraction/normalizeJobProfile.ts` — raw LLM JSON → validated
  `JobProfile`. **Deliberately no evidence-verification filtering**, unlike
  `normalizeProfile.ts` for resumes: a JD is the admin's own source
  document, not an unverified claim needing grounding against itself
  (buildPlan.md §20's hallucination protection targets resume claims
  specifically).
- `jobRepository`: added `setFileKey()` and `updateStatus()` (the latter was
  missing from the original feature #3 set).
- `lib/schemas/zodHelpers.ts` (new, shared): extracted `nullish()` — Gemini
  returns `null` for absent optional fields per our own prompt convention,
  and `.optional()` alone rejects `null` (found the hard way in feature #8's
  `studentProfile` schema). Applied proactively to `jobProfile.ts` before
  hitting the same bug via a real JD extraction call.
- `jobStatusSchema` gained an `EXTRACTED` state (was missing relative to
  `resumeStatusSchema`, needed for the worker's status sequence to match the
  resume pipeline).

### Deviations from spec

None. Followed `spec.md` §11/§12 as written.

### Tests written

- `tests/unit/workers/documentWorker.test.ts`: added a full
  `describe("processJobJob", ...)` block mirroring the existing
  `processResumeJob` suite — not-found, happy path (status sequence
  assertions), DOCX branch, `NEEDS_OCR`, `INVALID_EXTRACTION`,
  `EXTRACTION_ERROR` + rethrow. All deterministic (mocked deps), no live
  LLM/file calls, consistent with the reduced testing policy.
- No new tests for `GET /api/profile` or `POST /api/admin/jobs` routes
  themselves (thin handlers delegating to already-tested
  services/repositories) — consistent with feature #5's precedent.

### How to run backend tests

`npx jest tests/unit/workers/documentWorker.test.ts`

### Known limitations / things Frontend needs to know

- `GET /api/profile` returns `profile: null` when no resume has completed
  processing yet — the dashboard (feature #10) must handle that as an empty
  state, not an error.
- The JD worker pipeline has only been verified against mocked dependencies
  (per the current testing policy — no real JD PDF has been run through it
  yet). Real-file verification is deferred to the user's own physical
  testing, per their explicit instruction.
