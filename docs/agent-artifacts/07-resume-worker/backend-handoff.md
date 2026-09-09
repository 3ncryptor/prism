## Backend Handoff: Resume Worker

### What was built
- `lib/extract/pdfExtractor.ts` (`pdf-parse`), `lib/extract/docxExtractor.ts`
  (`mammoth`).
- `lib/extraction/textQuality.ts`: length/line-count/printable-ratio checks
  per buildPlan.md §18.
- `workers/document-worker.ts`: `processResumeJob` (get → EXTRACTING →
  download → extract → quality-check → EXTRACTED or FAILED/NEEDS_OCR;
  unexpected errors → FAILED/EXTRACTION_ERROR, rethrown for BullMQ retry)
  and `startDocumentWorker` (BullMQ `Worker`, concurrency 3), plus a
  `require.main` entrypoint with graceful shutdown.

### Deviations / real bugs found
1. **Jest can't run `pdf-parse`'s real extraction.** `pdfjs-dist` (which
   `pdf-parse` wraps) uses a dynamic `import()` internally for its Node
   worker fallback, which Jest's CJS transform rejects without
   `--experimental-vm-modules`. Reconfiguring Jest's module system to fix
   this risked breaking the 50+ already-passing tests, so instead:
   `extractPdfText` is verified (a) via mocks in
   `tests/unit/workers/documentWorker.test.ts` (full branching logic) and
   (b) manually against the real library outside Jest (plain `node`
   script, real minimal-PDF fixture — confirmed working). This is a
   genuine testing gap, not a code defect; flagging it plainly rather than
   quietly working around it.
2. **Found a real bug in `lib/db/client.ts` (feature #2):** `getDb()` only
   cached its `MongoClient` connection when `NODE_ENV === "development"` —
   everywhere else (including `test`, and **production**) it opened a
   brand-new, never-closed connection on every single call. This never
   surfaced before because every prior Docker test used its own
   manually-injected collection, bypassing the default singleton
   repositories entirely. This worker feature is the first to exercise the
   real singleton path end-to-end, which is what surfaced it. Fixed to
   always cache; added `closeMongoConnection()` for symmetry with
   feature #6's `closeRedisConnection()`, wired into the worker's shutdown
   handler.
3. **`next build`'s first TypeScript pass took 17 minutes** after adding
   `pdf-parse`/`pdfjs-dist` (huge bundled type definitions, cold
   `.tsbuildinfo` cache). Confirmed one-time: the rebuild immediately after
   took 4 seconds. Not a recurring cost, but worth knowing about if a CI
   cache is ever cleared.

### Tests written
- `tests/unit/extraction/textQuality.test.ts` — 4 tests.
- `tests/unit/workers/documentWorker.test.ts` — 5 tests (mocked): missing
  resume, PDF happy path, DOCX routing, NEEDS_OCR path, unexpected-error
  path (FAILED + rethrow).
- `tests/unit/extract/docxExtractor.test.ts` — 1 test against real
  mammoth + a real fixture.
- `tests/integration/workers/documentWorker.docker.test.ts` — 1 full
  end-to-end test: real Mongo + real S3 (MinIO) + real Redis/BullMQ + the
  real worker consuming a real queued job, exercising the FAILED/NEEDS_OCR
  path (no real .docx fixture available with enough text to reach
  EXTRACTED without hand-rolling a full OOXML ZIP writer — not worth the
  engineering risk for one test, given the EXTRACTED path is already
  covered by the mocked worker test + the direct real-mammoth test).

### How to run
Same as before (Docker running). All green: 56/56 tests, lint, typecheck,
build (now correctly fast after the one-time cache warm-up).

### Known limitations / things Frontend needs to know
No frontend work (worker process, no UI). LLM structuring (feature #8) is
the next stage — it extends this same worker file rather than replacing
it, per spec.md's documented scope boundary.
