## QA Report: Resume Worker

### Acceptance criteria
- [x] Worker picks up a real job (real Redis) and a real uploaded file
      (real S3/MinIO), transitions `UPLOADED→EXTRACTING→...` — PASS, real
      end-to-end Docker test (see note below on which terminal state).
- [~] A PDF and a DOCX file both extract successfully — **PDF: verified
      manually outside Jest** (real `pdf-parse`, real fixture, confirmed
      working), not via an automated test, due to a Jest/pdfjs-dist
      incompatibility documented in backend-handoff.md. **DOCX: PASS**,
      automated (`docxExtractor.test.ts`, real mammoth + real fixture).
- [x] Text that fails the quality check → `FAILED` with `NEEDS_OCR`, not
      silently passed through — PASS, both via mocked unit test and the
      real end-to-end Docker test.
- [x] A crash mid-processing leaves the resume `FAILED` with a message —
      PASS (`documentWorker.test.ts`: download failure → FAILED +
      EXTRACTION_ERROR + rethrow, verified).
- [x] `npm run build`, `npm run lint`, `npm test` all pass — PASS (56/56
      tests, lint clean, typecheck clean, build clean — see note on first
      build being slow).

### Test suite results
- Unit + integration: 56 total, all passing (12 real-Docker integration
  tests, the rest unit/mocked).
- Lint/typecheck/build: clean. First `next build` after this feature's
  `pdf-parse` dependency took 17 minutes (cold TypeScript cache from
  `pdfjs-dist`'s large type definitions); confirmed one-time — the
  immediate rebuild took 4 seconds. Flagging so nobody mistakes this for a
  regression if it happens again after a cache clear (e.g. fresh CI
  runner, `rm -rf .next`).

### Scope creep check
The worker correctly stops at `EXTRACTED`/`FAILED`, not `READY` — matches
spec.md's explicit scope boundary (LLM structuring is feature #8). No
matching-queue worker was added (correctly deferred to #17+).

### Security/sanity pass
- No secrets involved.
- Errors from S3/extraction failures are caught, logged to the `Resume`
  record with a code+message, and rethrown for BullMQ's retry — no silent
  failures, no raw internal errors leaking beyond what's stored.
- The `lib/db/client.ts` connection-leak fix (found this feature) is a
  correctness/production-stability fix with real security-adjacent value:
  an unbounded number of open MongoDB connections is a real availability
  risk in production, not just a test artifact.

### Verdict
**PASS**, with one disclosed, deliberate testing gap (PDF extraction
verified manually rather than via an automated Jest test, for a
documented, structural reason — not a shortcut taken carelessly).
