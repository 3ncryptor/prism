## QA Report: Feature #25 — Evaluation Harness

### Scope note (read first)
Per AGENTS.md Cross-Cutting Rule 4 (user override, 2026-09-11) and the buildPlan.md §67/§68 process (a real labeled dataset requires 100+ students/20+ JDs hand-labeled by placement staff, which does not exist yet), this feature ships **the harness tool and a synthetic smoke-test fixture set**, not a real accuracy measurement. `tests/evaluation/README.md` states this explicitly so the numbers are never mistaken for a real-world quality claim.

### Acceptance criteria
- [x] `npm run evaluate` exists and runs the harness — PASS (evidence: added to `package.json`, ran successfully)
- [x] Fixture convention matches buildPlan.md §78 (`evaluation/{resumes,jobs,labels}`) — PASS (`tests/evaluation/{resumes,jobs,labels}/`)
- [x] Harness runs the real deterministic matching engine (`evaluateMatch`) against fixtures, not a reimplementation — PASS (imports `lib/matching/matchingEngine.ts` directly)
- [x] Harness validates fixtures against the real `StudentProfile`/`JobProfile` Zod schemas before running — PASS (catches fixture/schema drift early rather than silently misinterpreting fields)
- [x] Reports computable metrics honestly; does not fabricate metrics that need real content — PASS (Bucket accuracy and Skill match recall are computed for real from fixture data; Extraction F1 and NDCG@20 print "N/A — requires real extracted resumes/JDs" / "N/A — requires a real ranked candidate pool" rather than a synthetic-fixture-derived number)
- [x] Every fixture label was hand-verified against the real matching engine's formulas (not guessed) — PASS (traced weights/thresholds by hand for all 6 pairs before running; live run matched every hand-computed bucket and skill list exactly on the first attempt)
- [x] Non-zero exit code on a mismatch, for CI/regression-gating use — PASS (`process.exitCode = 1` if `bucketAccuracy < 1`)

### Test suite results
- Live run: `npm run evaluate` → 6/6 pairs PASS, Bucket accuracy 100.0%, Skill match recall 100.0%.
- No new Jest unit tests — the harness itself *is* the test tool; wrapping it in a Jest test would just re-run the same fixture set through a second layer of indirection with no added signal, and the fixtures/labels already function as hand-verified assertions.
- Full suite: `npm test` → 151/152 passing; the one failure (`geminiExtractionProvider.test.ts`) is the same pre-existing, unrelated Gemini free-tier quota exhaustion seen in prior features — not a regression.
- Lint/typecheck/build: **PASS** — `npm run typecheck`, `npm run lint`, `npm run build` all clean.

### Scope creep found
- None. Did not attempt to build a real labeled dataset (out of scope per the explicit user override — no real content exists yet) or wire this into a CI pipeline (no CI workflow exists in this repo).

### Security/sanity pass
- No new routes, no new data exposure — this is a local dev-only script (`tsx scripts/evaluate.ts`), not a server endpoint.
- No secrets or real student/job data used — all fixtures are hand-authored synthetic values.

### Verdict
PASS — ready to commit
