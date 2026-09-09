## Backend Handoff: Resume Upload

### What was built
- `lib/services/resumeService.ts`: `uploadResume` (validate → deactivate
  prior active resume → create record → upload to S3 → set fileKey →
  create ProcessingJob), `getActiveResume`, `listResumes`.
- `app/api/resumes/route.ts`: `POST` (upload) + `GET` (list), both
  STUDENT-only via `requireRole`.
- `resumeRepository` gained `deactivateAllForStudent` and `setFileKey`
  (needed because the S3 key embeds the generated `resumeId`, which only
  exists after the DB record is created).

### Deviations
None.

### No Frontend stage (explicitly, per spec.md)
This feature is backend-only. The upload UI belongs to the student
dashboard (feature #10) — building a one-off form now would be redone
there. Verified via API-level tests instead of a browser flow.

### Tests written
- `tests/unit/services/resumeService.test.ts` — 4 tests (mocked deps):
  rejects bad mime type, rejects oversized file, full happy path (deactivate
  → upload → setFileKey → processing job → correct return shape), accepts
  DOCX.
- Extended `tests/integration/db/repositories.docker.test.ts` (real
  MongoDB) with `setFileKey` and a full `deactivateAllForStudent`
  versioning scenario (two resumes, only the newer one active, both still
  listable).

### How to run
Same as before. All green: 44/44 tests, lint, typecheck, build.

### Known limitations / things Frontend needs to know
- `POST /api/resumes` expects `multipart/form-data` with a `file` field.
- No queue dispatch happens yet — `ProcessingJob` sits at `QUEUED` with no
  consumer until feature #6 (queue) and #7 (worker) exist. This is
  expected, not a bug.
