## Backend Handoff: LLM Extraction

### What was built
- `lib/extraction/extractionProvider.ts`: `ExtractionProvider` interface.
- `lib/extraction/geminiExtractionProvider.ts`: real Gemini implementation,
  JSON response mode.
- `lib/extraction/prompts/resume-extraction-v1.ts`: versioned prompt per
  buildPlan.md §19.
- `lib/extraction/evidenceVerifier.ts`: §114's exact→fuzzy→unverified
  algorithm.
- `lib/extraction/normalizeProfile.ts`: raw LLM JSON → Zod-validated →
  evidence-filtered → fully-formed `StudentProfile`.
- `workers/document-worker.ts` extended: `EXTRACTED → STRUCTURING →
  VALIDATING → READY`, saving the profile via `studentProfileRepository`.
- `.env` created (gitignored) with your real `GEMINI_API_KEY`;
  `jest.setup.ts` auto-loads it for tests via `dotenv`.

### Real bugs found (this feature was unusually productive for catching them)
1. **`gemini-2.0-flash` is retired.** The real API told us directly:
   "use models/gemini-3.6-flash". This is exactly why `buildPlan.md`'s
   "prefer evidence over memory" research principle matters — a
   from-memory model name would have silently been wrong. Model is a
   plain constant (`DEFAULT_MODEL`), one-line change if it changes again;
   overridable via `GEMINI_MODEL` env var without a code change.
2. **Real schema bug**: Gemini returns `null` for absent optional fields
   (because our own prompt tells it to, following standard JSON
   convention) — but every "optional" field in `lib/schemas/studentProfile.ts`
   used `.optional()`, which only accepts `undefined`, not `null`. Zod
   rejected nearly every real response. Fixed with a `nullish()` helper
   (accepts either, normalizes to `undefined`) applied to all such fields.
   This would have broken on the very first real resume in production.
3. **`lib/logger.ts` bug (feature #1)**: used `??` for the `LOG_LEVEL` env
   var default, which doesn't fall back on an empty string — and `.env`
   files commonly leave unused vars as `KEY=` (empty). Pino then rejected
   `""` as an invalid level and crashed on import. Fixed to `||`.
4. **Confirmed real, live Gemini `503`s happen** (transient "high demand")
   during testing — expected/normal for any LLM API, not a bug; exactly
   what buildPlan.md §57's retry logic (already in the BullMQ queue config
   from feature #6) is for.

### Tests written
- `tests/unit/extraction/evidenceVerifier.test.ts` — 5 tests (exact, exact
  case/punctuation-insensitive, fuzzy paraphrase, unrelated claim, empty
  claim).
- `tests/unit/extraction/normalizeProfile.test.ts` — 5 tests (invalid
  shape, evidence-based discarding, canonicalization, metadata/versioning,
  totalExperienceMonths computation).
- `tests/unit/workers/documentWorker.test.ts` extended — now 6 tests
  covering the full EXTRACTING→READY happy path and the new
  INVALID_EXTRACTION failure path.
- `tests/integration/extraction/geminiExtractionProvider.test.ts` — 1 real
  live-API test (skips itself gracefully if `GEMINI_API_KEY` is absent),
  confirmed passing against the real API on a real sample resume.

### How to run
Same as before. `GEMINI_API_KEY` must be set in `.env` for the real-API
test to run (otherwise it self-skips, not fails). All green: 68/68 tests,
lint, typecheck, build.

### Known limitations / things Frontend needs to know
No frontend work (worker-only). Skill canonicalization is a placeholder
(lowercase/trim only) — feature #13 replaces it with real taxonomy-based
resolution. Embedding/indexing (feature #14) is the next worker stage.
