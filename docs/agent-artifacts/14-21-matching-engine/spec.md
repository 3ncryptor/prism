## Task: Features 14-21 (batched — Embeddings through Match Runs)

Batched per explicit user instruction ("lets build everything upto feature
no 21"). This is the core matching engine: embeddings, vector store,
candidate retrieval, and the deterministic scoring pipeline. Design is
already fully specified in `buildPlan.md` §5.5, §14, §22-§46, §53-§64 and
`docs/BACKEND_ARCHITECTURE.md` §0-§9 (a "finalized implementation
blueprint") — this spec is a build-tracking index against that design, not
a re-derivation of it. Where the two docs disagree, `BACKEND_ARCHITECTURE.md`
§0's clarified ambiguities win (it says so itself).

No frontend deliverable for 14-21: they are backend/data-pipeline features.
The admin UI to trigger/browse match runs is explicitly Feature #22
(Admin dashboard), out of scope here. #21 still gets a minimal API surface
(`POST /api/admin/jobs/:id/match`, `GET /api/admin/jobs/:id/results`) so
the feature is independently testable end-to-end, consistent with every
prior backend feature getting an API before its own frontend existed.

### 14. Embeddings
`lib/embeddings/embeddingProvider.ts` (interface: `modelId`, `dimensions`,
`embed(texts: string[]): Promise<number[][]>`) + `geminiEmbeddingProvider.ts`.
OpenAI deferred (matches `ExtractionProvider`'s Gemini-first precedent, per
the user's standing instruction to prove out Gemini before adding
Claude/OpenAI adapters).

**Verified live against the real Gemini API (not memory — the account's
previously-known `text-embedding-004` is retired, 404s):** the current
embedding model is `gemini-embedding-001`, native output 3072 dimensions.
The real Pinecone index (`prism-index`) already exists with
**dimension: 768**. Rather than recreate that index, `gemini-embedding-001`
supports Matryoshka truncation via an `outputDimensionality` request field
— verified live to return exactly 768-dim vectors on both the single
(`embedContent`) and batch (`batchEmbedContents`) REST endpoints. The
installed `@google/generative-ai` SDK's TypeScript types don't expose this
field, so `GeminiEmbeddingProvider` calls the REST endpoints directly via
`fetch` rather than the SDK, to keep the exact verified request shape.

### 15. Pinecone (Vector Store)
`lib/vectorStore/vectorStoreProvider.ts` (interface: `upsert(points)`,
`search(vector, filter, topK)`, `delete(ids)`) +
`pineconeVectorStoreProvider.ts`, per `buildPlan.md` §115a. Two logical
namespaces within the one real index: `student-features`, `job-features`
(Pinecone namespaces, not separate indexes/collections — Pinecone's
equivalent primitive). Deterministic point IDs per §56:
`student:{studentId}:resume:{resumeId}:{featureType}:{featureId}`.

### 16. Candidate retrieval
No population-level pre-filtering for V1 (`buildPlan.md` §23: "for a small
university, even scoring all 500 is acceptable... the architecture should
nevertheless support candidate filtering" — the *support* is the
`VectorStoreProvider.search` primitive itself, not a mandatory filtering
stage). What's built: `vectorStoreService.retrieveForStudentAgainstJob`
— for one student+job pair, vector-searches that student's own indexed
features (namespace-scoped, `studentId`-filtered) for each JD requirement/
responsibility/semantic-requirement text, returning per-requirement
best-evidence for the matchers' semantic layers.

### 17. Matching engine
`lib/matching/{eligibilityEngine,skillMatcher,experienceMatcher,
projectMatcher,educationMatcher,requirementMatcher,scoreAggregator,
penaltyEngine,bucketEngine,confidenceEngine,matchingEngine}.ts` — the
10 components from `buildPlan.md` §62 plus the orchestrator, exact
algorithms per `BACKEND_ARCHITECTURE.md` §6. Pure functions/classes: given
`StudentProfile` + `JobProfile` + `ScoringConfig` + pre-fetched retrieval
evidence, return scores — no I/O, per the project's existing testing
policy for "matching-engine-style pure logic" (`AGENTS.md` Cross-Cutting
Rule 4). `lib/config/degreeEquivalence.ts` (§0.5) backs education matching.

### 18. Scoring
`ScoreAggregator` (weighted formula, §31/§6.7) + `ScoringConfig` schema/
repository/service (§113.3) — versioned, immutable once referenced by a
`MatchRun` (§46), exactly one active at a time. Seeded default
`scoring-v1` (weights 25/30/15/15/10/5, buckets 80/60, semantic thresholds
0.85/0.75, `mandatoryPenalty` 0.75 — buildPlan's own example starting
values, explicitly flagged there as calibration placeholders, not tuned
business logic).

### 19. Bucketing
`BucketEngine` — deterministic thresholds from `config.buckets`
(BEST_FIT/MODERATE_FIT/LOW_FIT), applied even when `eligible: false`
(`BACKEND_ARCHITECTURE.md` §0.3 — ineligible students are still scored and
bucketed, just excluded from default views, not silently dropped).

### 20. Confidence
`ConfidenceEngine` — the 5-input weighted formula from `buildPlan.md`
§34-36 / `BACKEND_ARCHITECTURE.md` §6.10 (extractionQuality .20,
evidenceCoverage .30, matchingClarity .25, informationCompleteness .15,
deterministicCoverage .10).

### 21. Match runs
`MatchRun`/`MatchResult` schemas + repositories (§45, §38 + `eligible`
field per `BACKEND_ARCHITECTURE.md` §0.3), `MatchingService.startMatchRun`/
`runMatch`, a new `matching` BullMQ queue (`MATCH_JOB` payload) and
`workers/matching-worker.ts` (kept as its own module per
`BACKEND_ARCHITECTURE.md`'s file tree, but started from the same Node
process as the document worker for V1 infra simplicity — `buildPlan.md`
§58 explicitly allows one process consuming multiple queues). Minimal API:
`POST /api/admin/jobs/:id/match` (trigger), `GET /api/admin/jobs/:id/results`
(read) — enough to test the feature end-to-end; the browsable admin UI is
Feature #22.

Also: `workers/document-worker.ts`'s `processResumeJob`/`processJobJob`
gain the `INDEXING` step (already present in both status enums, previously
unused) between `VALIDATING` and `READY` — embeds each profile's meaningful
features and upserts them via the vector store, per `buildPlan.md` §15/§21's
pipeline diagrams and §43 ("student embeddings generated when resume
uploaded/replaced; JD embeddings generated when JD uploaded/updated").

### Explicit scope boundaries
- No admin UI to trigger/browse matches (Feature #22).
- No publish/hide (#22a), no skill-taxonomy/scoring-config admin UI
  (#22b/#22c), no evidence UI (#23), no CSV export (#24).
- No LLM reranker (`buildPlan.md` §65 — explicitly not V1 core).
- No population-level candidate pre-filtering beyond what's noted in #16
  above — V1 scores the full active student population per match run
  (`studentProfileRepository.listAllActive()`), matching
  `BACKEND_ARCHITECTURE.md` §7's worker pseudocode exactly.
- Per the current testing policy, full unit-test coverage for the
  matching engine's pure logic (this is the policy's own named example —
  "the matching engine's scoring, bucketing, penalty, and eligibility
  logic — features #17-#21", `AGENTS.md` Cross-Cutting Rule 4). Embedding/
  vector-store provider code gets lighter coverage (real-API/real-Pinecone
  verification done manually during this build, per feature #8's
  precedent), consistent with not building exhaustive suites around
  external-service-quality-dependent code.

### Acceptance criteria (condensed)
- [ ] `GeminiEmbeddingProvider.embed(["React"])` returns a 768-dim vector,
      verified against the real Gemini API
- [ ] `PineconeVectorStoreProvider.upsert/search` round-trips against the
      real `prism-index`
- [ ] A resume/JD reaching `READY` has its features indexed in Pinecone
      (verified manually against real data, per the current feature's
      pipeline)
- [ ] `matchingEngine.evaluate(student, job, config, evidence)` produces a
      `MatchEvaluation` with all fields populated, unit-tested across
      eligible/ineligible, mandatory-miss, and clean-pass fixtures
- [ ] `POST /api/admin/jobs/:id/match` creates a `MatchRun`, the matching
      worker processes it to `COMPLETED`, and `MatchResult` documents exist
      for the active student population — verified against real seeded
      data end-to-end
- [ ] `npm run build`, `npm run lint`, `npm run typecheck` all pass
