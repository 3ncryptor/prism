## QA Report: Resume Upload

### Acceptance criteria
- [x] Valid PDF/DOCX under 10MB uploads, returns `{resumeId, status:
      "QUEUED"}` — PASS (unit test, happy-path + DOCX case).
- [x] Oversized file rejected with clear error, not stored — PASS
      (`FileTooLargeError`, verified `create`/`uploadFile` never called).
- [x] Wrong file type rejected, not stored — PASS (`InvalidFileTypeError`,
      same non-call verification).
- [x] Unauthenticated → 401; non-STUDENT → 403 — PASS by construction:
      `route.ts` calls `requireRole("STUDENT")` first, mapped to 401/403 in
      `handleError`; `requireRole` itself was unit-tested in feature #2.
- [x] Second upload doesn't delete the first, only the new one active —
      PASS (real-MongoDB integration test: two resumes, first inactive,
      second active, both listable).
- [x] `npm run build`, `npm run lint`, `npm test` all pass — PASS (44/44
      tests, lint clean, typecheck clean, build clean, `/api/resumes`
      route confirmed registered).

### Test suite results
- Unit: 34 (30 prior + 4 new resumeService tests).
- Integration (real Docker): 10 (9 prior + 1 new versioning scenario,
  folded into the existing Mongo suite rather than a new container).
- Lint/typecheck/build: clean.

### Scope creep check
No Frontend work was done, matching spec.md's explicit backend-only
declaration — not an omission. No queue/worker logic was added despite
being adjacent — correctly deferred to features #6/#7.

### Security/sanity pass
- File type validated by MIME type against an explicit allowlist (not
  filename extension alone) — matches buildPlan.md §82's spirit; deeper
  content-sniffing validation (magic bytes) is not yet implemented and
  should be considered in the hardening feature (#27).
- Size limit enforced before any S3 upload or DB write — no way to bypass
  by omitting `size` (it's read from the actual `File` object server-side,
  not client-supplied metadata).
- Role check happens before any request body is even parsed for file
  content in the DB-touching path.

### Verdict
**PASS.**
