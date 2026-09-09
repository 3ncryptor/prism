## Task: LLM Extraction

### Goal
Extend the document worker (feature #7) with the next stage: LLM-based
structured extraction of resume text into a validated `StudentProfile`,
per `buildPlan.md` §19-§20 (structuring, hallucination protection). The
worker now progresses `EXTRACTED → STRUCTURING → VALIDATING → READY`
(stopping before `INDEXING`/embeddings, feature #14).

### In scope
- `lib/extraction/extractionProvider.ts`: `ExtractionProvider` interface
  (`docs/BACKEND_ARCHITECTURE.md` §4) + `GeminiExtractionProvider`
  (dev-only per the finalized provider matrix, `buildPlan.md` §5.7).
- `lib/extraction/prompts/resume-extraction-v1.ts`: versioned prompt per
  §19 (extract-only, no invention, evidence required, separate
  projects/experience, schema-conforming JSON).
- `lib/extraction/evidenceVerifier.ts`: buildPlan.md §114's algorithm
  (exact substring → token-overlap fallback → `needs_review`).
- `lib/extraction/normalizeProfile.ts`: raw LLM JSON → validated
  `StudentProfile` (Zod parse + skill canonicalization stub — full
  taxonomy-based canonicalization is feature #13; for now, canonicalName
  is a simple lowercase/trim of the raw name, revisited then).
- `workers/document-worker.ts` extended: `EXTRACTED` → call extraction
  provider → validate/normalize → verify evidence → save `StudentProfile`
  → `READY`. Malformed/unparseable LLM output → `FAILED` with a clear
  code, not a crash.
- Real Gemini API integration test (using your `GEMINI_API_KEY` in a local
  `.env`, auto-loaded by a small Jest setup addition) — a live call against
  a small real resume text fixture, asserting the response validates
  against the `StudentProfile` schema.

### Out of scope
- Skill taxonomy / canonical alias resolution (feature #13) — this
  feature's canonicalization is a placeholder, explicitly noted as such.
- Embedding/indexing (feature #14).
- JD extraction (shares the same `ExtractionProvider`/prompt pattern but
  is feature #12's job to wire up).
- Claude (prod) provider implementation — only Gemini (dev) is built now;
  `ExtractionProvider`'s interface is provider-agnostic so Claude slots in
  later without changing callers.

### Acceptance Criteria
- [ ] A real Gemini call on real resume text returns JSON that validates
      against `StudentProfileSchema` (minus fields the worker fills in
      itself, e.g. `_id`/timestamps)
- [ ] A skill/claim with no supporting evidence in the source text is
      marked `needs_review`, not silently trusted (§114 test cases: exact
      match, fuzzy match, no match)
- [ ] Malformed LLM output (fails Zod validation) → resume `FAILED` with a
      clear error code, not an unhandled exception
- [ ] Worker: `EXTRACTED → STRUCTURING → VALIDATING → READY` on success
- [ ] `npm run build`, `npm run lint`, `npm test` all pass
