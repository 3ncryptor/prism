## QA Report: Features 14-21 (Embeddings through Match Runs)

### Acceptance criteria (from spec.md)

- [x] `GeminiEmbeddingProvider.embed(["React"])` returns a 768-dim vector,
      verified against the real Gemini API — PASS. Also discovered and
      fixed a real issue during this: the previously-known
      `text-embedding-004` model is retired (404); the live model list
      showed `gemini-embedding-001` (3072-dim native), and its real
      Pinecone index (`prism-index`) was created at 768 dims — resolved by
      requesting `outputDimensionality: 768` (Matryoshka truncation),
      verified live to return exactly 768 dims on both single and batch
      endpoints.
- [x] `PineconeVectorStoreProvider.upsert/search` round-trips against the
      real `prism-index` — PASS. Full embed → upsert → search (correct
      match, score ~1.0) → delete cycle run live; a `deleteMany` request
      shape bug (bare array vs `{ids: [...]}}`) was found and fixed via
      this same live test, not guessed.
- [x] A resume/JD reaching `READY` has its features indexed in Pinecone —
      PASS. Verified by uploading a real resume through the actual student
      upload flow; it reached `READY` after passing through the new
      `INDEXING` step (previously an unused status value).
- [x] `matchingEngine.evaluate(...)` produces a full `MatchEvaluation`,
      unit-tested across eligible/ineligible/mandatory-miss/clean-pass
      fixtures — PASS, 50 unit tests across all 10 matching components,
      all passing.
- [x] `POST /api/admin/jobs/:id/match` creates a `MatchRun`, the matching
      worker processes it to `COMPLETED`, and `MatchResult` documents exist
      for the active student population — PASS, verified end-to-end
      against real seeded data (see below).
- [x] `npm run build`, `npm run lint`, `npm run typecheck` all pass — PASS.

### Test suite results

- Full suite: `npx jest` → 33 suites, 146 tests, all pass (96 new tests
  added this batch: 50 for the matching engine's pure logic across 11
  files, 9 for the matching worker/service, plus updates to
  `documentWorker.test.ts` for the new `INDEXING` step).
- Lint: clean. Typecheck: clean. Build: succeeds; both new dynamic API
  routes (`/api/admin/jobs/[id]/match`, `/api/admin/jobs/[id]/results`)
  compile correctly with Next's generated route-context types.

### Live end-to-end verification (not just build/lint/test)

This is the most consequential feature batch so far (the actual matching
engine), so it was verified against real infrastructure end-to-end, not
just unit tests:

1. Uploaded a synthetic resume for a clean seeded student (`student3`)
   through the real `/api/resumes` endpoint. It reached `READY`,
   confirming the new `INDEXING` step (real Gemini embeddings → real
   Pinecone upsert) works inside the actual worker pipeline.
2. Uploaded a synthetic JD through the real `/api/admin/jobs` endpoint.
   Its extraction step hit Gemini's free-tier **daily** quota (20
   requests/day for `gemini-3.6-flash`, exhausted by this session's
   extensive earlier testing) — a real external constraint, not a bug;
   the new retry logic (from the earlier Gemini reliability fix) correctly
   gave up after 3 attempts rather than looping forever against an
   exhausted daily quota. To verify the *new* code (which doesn't depend
   on JD extraction specifically — extraction was already proven working
   repeatedly earlier this session) without waiting ~24h for quota reset,
   a realistic `JobProfile` was inserted directly and the job marked
   `READY`, then the real pipeline was driven from that point forward.
3. Triggered a match run via the real `POST /api/admin/jobs/:id/match`
   endpoint (authenticated as the seeded admin over a real HTTP request,
   not a direct function call). Got back `202 { matchRunId, status:
   "QUEUED" }`.
4. The real matching worker (running as a background process) picked up
   the job from the real Redis queue, embedded the JD's requirements via
   a real Gemini call, ran the real matching engine against all 3 active
   seeded students, and completed the run in ~4 seconds.
5. Verified the actual `MatchResult` documents:
   - The synthetic student (exact-matching skills, education, and
     experience) scored **90.89, BEST_FIT, eligible: true**, with 100%
     skill/education/experience category scores and a genuine **39.3%
     semantic match** on the project-matching category (a real Pinecone
     vector search result, not exact — proving the semantic retrieval
     layer works, not just the exact-match layer).
   - The two real, unrelated students (a marketing/events profile, not a
     software profile) both correctly scored **30, LOW_FIT, eligible:
     false**, with an accurate `missingRequirements: ["Python", "Django",
     "Machine Learning"]` list.
6. Verified `GET /api/admin/jobs/:id/results`: default view excludes
   ineligible students (1 result), `?includeIneligible=true` returns all 3
   sorted by score descending — matching
   `BACKEND_ARCHITECTURE.md` §0.3's exact intent (ineligible students are
   scored and auditable, not silently dropped).

This is real evidence the matching engine's core value proposition
(explainable, evidence-backed scoring) works correctly, not just that the
code compiles and unit tests pass with synthetic mocks.

### Scope creep found

- None beyond what spec.md already flagged (the `npm run worker` /
  `workers/index.ts` combined-entrypoint restructuring was already noted
  as scope-adjacent in the Feature #10 QA report; this batch's
  `workers/index.ts` change is a direct continuation of that, not new
  scope creep).

### Security/sanity pass

- No secrets committed. Both new API routes are gated by
  `requireRole("ADMIN")` before touching any data.
- `PineconeVectorStoreProvider`/`GeminiEmbeddingProvider` read their
  credentials from env vars only, never hardcoded.
- Worker error paths (`processMatchRun`) mark the run `FAILED` with a
  structured error and rethrow for BullMQ retry, matching the existing
  `document-worker.ts` convention — no silent failure swallowing.

### Known limitations (documented, not hidden)

- `confidenceEngine.ts`'s `extractionQuality` input is approximated from
  whether the profile has substantive content, since no persisted
  text-quality/needs_review field exists on `StudentProfile` today (see
  the file's own doc comment).
- `experienceMatcher.ts`'s domain relevance is a deterministic keyword
  check, not a vector search (documented trade-off, tunable later).
- No population-level candidate pre-filtering — V1 scores the full active
  student population per run, per `buildPlan.md` §23's explicit tolerance
  for this at small (~500 student) scale.
- The manually-inserted test `JobProfile`/`Job`/`MatchRun`/`MatchResult`
  documents from the live verification (job title "Machine Learning
  Engineer" / company "DataCorp", clearly synthetic) are still in the
  database — left in place as an inspectable example of the pipeline
  working end-to-end, since there's no admin UI yet (feature #22) to
  browse this otherwise. Can be deleted on request.

### Verdict

PASS — ready to commit.
