## Task: Resume Worker

### Goal
A standalone worker process that consumes `RESUME_PROCESS` jobs from the
queue (feature #6) and drives the resume through
`EXTRACTING → EXTRACTED → READY/FAILED` (buildPlan.md §17), stopping
**before** LLM structuring (§19, feature #8) and embedding (feature #14) —
those don't exist yet. This is the first piece of `workers/` (buildPlan.md
§92: separate process, not a Next.js request).

### In scope
- `lib/extract/pdfExtractor.ts`, `lib/extract/docxExtractor.ts`: text
  extraction from the downloaded file buffer (`pdf-parse`, `mammoth`).
- `lib/extraction/textQuality.ts`: buildPlan.md §18 quality checks (text
  length, character ratio) → flags `FAILED` with `NEEDS_OCR` rather than
  passing garbage text downstream.
- `workers/document-worker.ts`: pulls `RESUME_PROCESS` jobs from
  `documentProcessingQueue`, downloads from S3, extracts text, quality-checks
  it, and stops there for now (§8 LLM extraction is the next stage,
  feature #8) — sets status to `EXTRACTED` on success or `FAILED` +
  `NEEDS_OCR` on bad text, per buildPlan.md §17's state machine. Handles
  connection shutdown correctly (feature #6's `closeRedisConnection` note).

### Explicit scope boundary (why this stops at EXTRACTED, not READY)
buildPlan.md §17's full state list is
`UPLOADED→QUEUED→EXTRACTING→EXTRACTED→STRUCTURING→VALIDATING→INDEXING→READY`.
`STRUCTURING` (LLM call) is feature #8, `VALIDATING`/normalization is also
#8, `INDEXING` (embeddings→Qdrant) is feature #14. Building the worker up
through `READY` now would mean either stubbing an LLM call (against the
spirit of "build one real feature at a time") or blocking this feature on
#8/#14 being done first, which inverts the dependency order in
buildPlan.md §106. This worker is a real, complete, testable unit on its
own: text extraction + quality gating. Feature #8 extends this same
worker file with the next stage rather than replacing it.

### Out of scope
- LLM structuring (feature #8).
- Embedding/indexing (feature #14).
- Matching-queue worker (feature #17+).

### Acceptance Criteria
- [ ] Worker picks up a real `RESUME_PROCESS` job (real Redis) and a real
      uploaded file (real S3/MinIO), transitions `UPLOADED→EXTRACTING→EXTRACTED`
- [ ] A PDF and a DOCX file both extract successfully
- [ ] Text that fails the quality check → `FAILED` with `errorCode:
      "NEEDS_OCR"`, not silently passed through
- [ ] A crash mid-processing leaves the resume `FAILED` with a message, not
      stuck `EXTRACTING` forever with no record of what happened
- [ ] `npm run build`, `npm run lint`, `npm test` all pass
