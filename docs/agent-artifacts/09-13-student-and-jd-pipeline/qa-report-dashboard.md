## QA Report: Feature #10 (Student Dashboard)

### Acceptance criteria (from spec.md + user-approved page structure)

- [x] `/student` renders real data (not the placeholder), upload form works
      against the real API — PASS, verified live: uploaded a real file
      through the actual UI, real Gemini extraction ran, real profile
      rendered.
- [x] Header, resume status card (badge + upload), extracted-profile
      section, empty state — PASS, all four present and behave correctly
      across empty/processing/ready/failed states.
- [x] No "applications" section — PASS (not built, per scope).
- [x] `npm run build`, `npm run lint`, `npm run typecheck` all pass — PASS.

### Test suite results

- Full suite: `npx jest` → 20 suites, 87 tests, all pass (includes 6 new
  tests for the Gemini retry fix — see the separate retry-fix note below).
- Lint: clean. Typecheck: clean. Build: succeeds (all 8 routes compile).

### Live browser verification (chrome-devtools MCP, not just build/test)

- Signed in as a seeded student (`student1@prism.dev`), confirmed
  role-gated redirect and empty state.
- **Found and fixed a real dark-mode contrast bug**: page text was nearly
  invisible against the OS-dark-mode background because Grauity's theme is
  pinned to light while the site's own CSS vars flip dark. Fixed with an
  explicit light surface; re-verified visually after the fix — text fully
  legible.
- **Found and fixed a real SSR hydration-mismatch bug**: confirmed via the
  Next.js dev error overlay that nearly every Grauity component
  (`NSTypography`, `NSButton`, the internal `GrauityInit` wrapper)
  generated different class names on server vs. client. Root-caused to
  Grauity's dist build lacking styled-components SSR metadata (verified by
  reading its actual bundled source, not guessed). Fixed by making the
  Grauity-styled subtree client-only. Re-verified: dev overlay's issue
  count went from 1 to 0, console clean.
- Uploaded a synthetic (fabricated, non-personal) test PDF as a second
  seeded student, watched status move from Processing → Ready via the
  polling loop, confirmed the real Gemini-extracted skills (grouped by
  category), one project, one experience entry, and one education entry
  all rendered correctly in the UI.
- Cross-checked MongoDB directly during testing to confirm per-student
  data isolation (no cross-account leakage) — a stale accessibility
  snapshot briefly looked like a leak but was verified to be a UI
  render-timing artifact, not real data crossing accounts.

### Scope creep found

- Added `npm run worker` script (`package.json`) — not in spec.md, but a
  real, necessary gap: there was previously no documented way to run the
  document-processing worker at all, which is plausibly why resume
  processing was getting stuck. Noted here per Cross-Cutting Rule 3
  rather than included silently.

### Security/sanity pass

- No secrets committed. `/student` remains gated by `requireRole("STUDENT")`
  server-side; the client dashboard only ever fetches `/api/profile` and
  `/api/resumes`, both already auth-checked.

### Verdict

PASS — ready to commit.

---

## Related fix (same session, reported directly by the user): Gemini 503 resilience

Not part of Feature #10's original scope, but fixed in the same pass per
explicit user priority ("help solve the problem" — a live
`[503 Service Unavailable] ... high demand` error from Gemini during a
real resume upload, UI polish deferred until after).

- Root cause: `GeminiExtractionProvider`'s `generateContent` call had zero
  retry logic — a single transient 503/429 from Google (their own error
  text calls these "usually temporary") failed the entire extraction
  immediately, even though BullMQ's job-level retry (already configured,
  3 attempts) would eventually re-run the *whole* pipeline (re-download,
  re-extract text, re-call the LLM) rather than just retrying the LLM call.
- Fix: `generateContentWithRetry` in `geminiExtractionProvider.ts` retries
  only on `GoogleGenerativeAIFetchError` with status 429/503 (verified
  against the SDK's actual exported error class, not guessed), up to 3
  retries with exponential backoff (1s/2s/4s), before falling through to
  BullMQ's existing job-level retry as a second safety net. Non-retryable
  errors (bad input, JSON parse failures, auth errors) propagate
  immediately, unchanged.
- Tests: `tests/unit/extraction/geminiExtractionProvider.test.ts` — 6 new
  tests (success without retry, retry-then-succeed on 503, retry-then-
  succeed on 429, no retry on 400, no retry on a plain non-HTTP error,
  exhausts all attempts on a persistent 503), using Jest fake timers so
  the suite doesn't actually wait through the backoff delays. All pass.
- Also added `npm run worker` (see above) since a worker not running at
  all would look identical to "processing is stuck," and there was no
  documented way to start one before this.
