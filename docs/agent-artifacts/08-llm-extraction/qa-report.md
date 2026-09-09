## QA Report: LLM Extraction

### Acceptance criteria
- [x] A real Gemini call on real resume text validates against
      `StudentProfileSchema` — PASS, confirmed against the live API
      (`geminiExtractionProvider.test.ts`), reproducible (re-ran after a
      transient upstream 503, passed cleanly).
- [x] A claim with no supporting evidence is marked/discarded, not
      silently trusted — PASS: exact match, fuzzy match, and no-match cases
      all verified (`evidenceVerifier.test.ts`); discarding behavior
      verified in `normalizeProfile.test.ts`.
- [x] Malformed LLM output → resume `FAILED` with a clear code, not an
      unhandled exception — PASS (`documentWorker.test.ts`:
      `INVALID_EXTRACTION`, verified `studentProfiles.save` never called).
- [x] Worker: `EXTRACTED → STRUCTURING → VALIDATING → READY` on success —
      PASS, full call-order assertion in `documentWorker.test.ts`.
- [x] `npm run build`, `npm run lint`, `npm test` all pass — PASS (68/68
      tests, lint clean, typecheck clean, build clean, confirmed on a
      clean rerun after an unrelated transient Gemini 503).

### Test suite results
- Unit + integration: 68 total, all passing (13 real-Docker/real-API
  integration tests, the rest unit).
- Lint/typecheck/build: clean.
- Flakiness note: the live-Gemini test failed once during this session's
  own verification run with a transient upstream `503 Service
  Unavailable`. Re-run passed cleanly. This is expected, external-service
  variance, not a defect; flagging per QA process rather than silently
  re-running until green without comment.

### Scope creep check
Canonicalization is deliberately a placeholder (spec.md's explicit
boundary) — not full taxonomy resolution (feature #13). No embedding/
indexing was added (feature #14). JD extraction wasn't wired up (feature
#12) even though the same provider/prompt pattern would trivially support
it — correctly left for that feature to own.

### Security/sanity pass
- `GEMINI_API_KEY` lives only in `.env` (gitignored, confirmed via
  `git check-ignore -v .env`); never printed/logged in any file, test
  output, or commit.
- LLM output is never trusted directly: schema-validated, then every
  evidence-bearing claim is independently checked against the actual
  source text before being persisted — matches buildPlan.md §20's
  hallucination-protection requirement exactly.
- No `console.log` in new code.

### Verdict
**PASS.** Four real bugs found and fixed this feature (retired model name,
a schema/LLM-null mismatch that would have broken on the first real
resume, a logger crash on empty env vars, and confirmed real API
flakiness) — a good return on the real-API testing investment.
