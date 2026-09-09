## Task: Resume Upload

### Goal
Student uploads a resume; backend validates it, stores the file, creates
`Resume` + `ProcessingJob` records, and returns immediately without
waiting for extraction (buildPlan.md §16). This feature is **backend-only**
— no Frontend stage. The real upload UI lives on the student dashboard
(feature #10); building it here would be redone there. Actual queuing
(BullMQ push) is feature #6 — this feature creates the `ProcessingJob`
record as `QUEUED` but does not yet dispatch it anywhere, since nothing
consumes it until the worker (feature #7) exists.

### In scope
- `lib/services/resumeService.ts`: `uploadResume(studentId, file)` —
  validates type (`pdf`/`docx` only) and size (max 10MB, buildPlan.md §82),
  uploads to S3 via `buildResumeKey`, creates the `Resume` record
  (`UPLOADED`), creates a `ProcessingJob` (`RESUME_PROCESS`), returns
  `{resumeId, status: "QUEUED"}`. Also `getActiveResume`, `listResumes`.
- `app/api/resumes/route.ts`: `POST` (upload, STUDENT-only) and `GET`
  (list own resumes, STUDENT-only).

### Out of scope
- Actual BullMQ enqueue (feature #6).
- Text extraction / any worker logic (feature #7+).
- Upload UI (feature #10).

### Acceptance Criteria
- [ ] Valid PDF/DOCX under 10MB uploads successfully, returns
      `{resumeId, status: "QUEUED"}` immediately
- [ ] Oversized file rejected with a clear 400, not stored
- [ ] Wrong file type rejected with a clear 400, not stored
- [ ] Unauthenticated request → 401; non-STUDENT → 403
- [ ] A second upload for the same student does not delete the first
      (versioning, buildPlan.md §54) — old resume remains queryable via
      `listResumes`, only the new one is `isActive`
- [ ] `npm run build`, `npm run lint`, `npm test` all pass
