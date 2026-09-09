# Prism — Backend Architecture & Detailed Design (V1)

**Status:** Finalized implementation blueprint.
**Relationship to other docs:** `buildPlan.md` is the product spec (what/why) —
this document is the backend blueprint (how). `AGENTS.md` is the process
(who does what, in what order). Read all three; when they conflict, `AGENTS.md`
§118 (decision log) and this doc's §0 "Clarified ambiguities" win, since they
are the most recently resolved.

This doc supersedes `buildPlan.md` §115 with file-level detail and expands
§47–§64 into concrete method signatures and algorithms. Section numbers below
are local to this document (not continuous with `buildPlan.md`'s numbering).

---

## 0. Clarified ambiguities (read this first)

`buildPlan.md` left a few things implicit enough that two engineers could
build them differently. These are now pinned:

1. **"Hard filters" (§24) vs "Hard Requirements" scoring category (§31) are
   two different mechanisms, not one.** `buildPlan.md` uses "hard
   requirement" for both an eligibility gate and a 25%-weighted score
   category, which reads as if the same check does both jobs. It doesn't:
   - **Eligibility gate** (binary, runs first): `JobConstraint` /
     `EducationRequirement` / `ExperienceRequirement` entries where
     `disqualifying: true`. Fail one → `eligible = false`.
   - **Hard Requirements category score** (0–100, weighted 25% in the final
     formula): scored from constraints where `disqualifying: false` (soft
     constraints — "preferred graduation year 2026", "nice to have AWS
     certification"). If a JD has zero soft constraints, this category
     defaults to **100**, not 0 — there's nothing to penalize.
   - Mandatory *skills* (importance `MANDATORY` on a `Requirement`, not a
     `JobConstraint`) are scored inside the **Skills** category and separately
     trigger the mandatory-requirement penalty (§7.8 below) — they are not
     part of either hard-requirements mechanism above.

2. **Mandatory-skill penalty (§32) applies once, not per missing skill.** If
   three mandatory skills are all missing, the penalty multiplier
   (`config.mandatoryPenalty`) applies a single time, not compounded three
   times. Compounding would double-count — the Skills category score already
   reflects each individual miss. This is a starting rule; recalibrate against
   evaluation data per `buildPlan.md` §66/§73.

3. **Ineligible students are still scored, not skipped.** `eligible: false`
   is stored on the `MatchResult` (new field, extends `buildPlan.md` §38) and
   surfaced in the evidence, so an admin can see *how close* a disqualified
   student was. Ineligible students are excluded from the default bucket
   view/CSV export but visible behind a "show ineligible" filter — this keeps
   the data auditable without an admin accidentally acting on a disqualified
   candidate.

4. **`ScoringConfig` is resolved and pinned at match-run creation, not at
   worker-execution time.** `matchingService.startMatchRun` reads whatever
   config is currently active and stamps its `version` onto the new
   `MatchRun`. The matching worker later fetches *that specific version* by
   id, never "whatever's active right now" — otherwise an admin activating a
   new config mid-run would make the run internally inconsistent, violating
   `buildPlan.md` §108 Principle 1 (determinism).

5. **Degree/field equivalence needs its own small taxonomy**, not string
   equality. "B.Tech" / "B.E." and "CSE" / "Computer Science" are the same
   thing for matching purposes (`buildPlan.md` §30's own example assumes
   this) but aren't equal strings. `lib/matching/educationMatcher.ts` uses a
   small static equivalence table (`lib/config/degreeEquivalence.ts`),
   seeded like the skill taxonomy, not ad hoc string comparisons.

6. **An unpublished JD is not invisible to the student** — the student sees
   it listed as "Under review" (no score/bucket/evidence) rather than the JD
   disappearing from their applications list. `jobService.listStudentVisibleJobs`
   returns all jobs the student has a `MatchResult` for, redacting
   score/bucket/evidence fields when `job.publishedMatchRunId` doesn't match.

None of these are architecture-boundary decisions (auth, schema shape, tenant
model) — they're tunable matching-engine behavior, explicitly flagged as
calibration starting points, same spirit as `buildPlan.md` §26/§27's own
caveats. Flag any of these you want changed before Backend starts feature #17.

---

## 1. Folder structure (file-level)

```text
prism/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── student/
│   │   ├── layout.tsx
│   │   ├── page.tsx                      # dashboard (§2.1)
│   │   ├── resume/page.tsx
│   │   └── applications/page.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── students/page.tsx
│   │   ├── students/[id]/page.tsx
│   │   ├── jobs/page.tsx
│   │   ├── jobs/new/page.tsx
│   │   ├── jobs/[id]/page.tsx             # results + publish/hide (§84)
│   │   ├── jobs/[id]/results/[studentId]/page.tsx
│   │   ├── skill-taxonomy/page.tsx        # §116
│   │   └── scoring-config/page.tsx        # §116
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── resumes/route.ts                # POST, GET
│       ├── resumes/[id]/route.ts            # GET
│       ├── profile/route.ts                  # GET (own profile)
│       ├── jobs/route.ts                      # GET (student-visible list)
│       ├── jobs/[id]/route.ts
│       ├── matches/route.ts                    # GET (own match results)
│       └── admin/
│           ├── students/route.ts
│           ├── students/[id]/route.ts
│           ├── jobs/route.ts                    # POST, GET
│           ├── jobs/[id]/route.ts
│           ├── jobs/[id]/match/route.ts           # POST
│           ├── jobs/[id]/rematch/route.ts
│           ├── jobs/[id]/publish-results/route.ts
│           ├── jobs/[id]/hide-results/route.ts
│           ├── jobs/[id]/results/route.ts
│           ├── jobs/[id]/results/[studentId]/route.ts
│           ├── jobs/[id]/export/route.ts
│           ├── matching-runs/[id]/route.ts
│           ├── skill-taxonomy/route.ts
│           ├── skill-taxonomy/[id]/route.ts
│           ├── scoring-configs/route.ts
│           └── scoring-configs/[id]/activate/route.ts
│
├── lib/
│   ├── db/
│   │   ├── client.ts                        # Mongo singleton connection
│   │   ├── indexes.ts                         # index creation (run at seed/boot)
│   │   └── repositories/
│   │       ├── userRepository.ts
│   │       ├── studentRepository.ts
│   │       ├── resumeRepository.ts
│   │       ├── studentProfileRepository.ts
│   │       ├── jobRepository.ts
│   │       ├── jobProfileRepository.ts
│   │       ├── processingJobRepository.ts
│   │       ├── matchRunRepository.ts
│   │       ├── matchResultRepository.ts
│   │       ├── skillTaxonomyRepository.ts
│   │       ├── scoringConfigRepository.ts
│   │       └── auditLogRepository.ts
│   │
│   ├── schemas/
│   │   ├── user.ts
│   │   ├── studentProfile.ts                 # buildPlan §9-§12, §113.1
│   │   ├── jobProfile.ts                       # buildPlan §13-§14, §113.1
│   │   ├── skillTaxonomy.ts
│   │   ├── scoringConfig.ts
│   │   ├── matchResult.ts                       # buildPlan §37-§38 + eligible field
│   │   └── api/                                  # request/response Zod per route
│   │       ├── resumes.ts
│   │       ├── jobs.ts
│   │       └── admin.ts
│   │
│   ├── services/
│   │   ├── resumeService.ts
│   │   ├── jobService.ts
│   │   ├── studentService.ts
│   │   ├── matchingService.ts
│   │   ├── extractionService.ts
│   │   ├── embeddingService.ts
│   │   ├── qdrantService.ts
│   │   ├── queueService.ts
│   │   ├── skillTaxonomyService.ts
│   │   ├── scoringConfigService.ts
│   │   └── auditService.ts
│   │
│   ├── matching/
│   │   ├── eligibilityEngine.ts
│   │   ├── skillMatcher.ts
│   │   ├── experienceMatcher.ts
│   │   ├── projectMatcher.ts
│   │   ├── educationMatcher.ts
│   │   ├── requirementMatcher.ts                 # SemanticRequirement / "other" category
│   │   ├── scoreAggregator.ts
│   │   ├── penaltyEngine.ts
│   │   ├── bucketEngine.ts
│   │   ├── confidenceEngine.ts
│   │   └── matchingEngine.ts                      # orchestrator (buildPlan §63)
│   │
│   ├── extraction/
│   │   ├── extractionProvider.ts                   # interface (buildPlan §5.7)
│   │   ├── geminiExtractionProvider.ts
│   │   ├── claudeExtractionProvider.ts
│   │   ├── prompts/
│   │   │   ├── resume-extraction-v1.ts
│   │   │   └── jd-extraction-v1.ts
│   │   ├── evidenceVerifier.ts                       # buildPlan §114
│   │   └── textQuality.ts                             # buildPlan §18
│   │
│   ├── embeddings/
│   │   ├── embeddingProvider.ts                        # interface (buildPlan §5.7)
│   │   ├── geminiEmbeddingProvider.ts
│   │   └── openaiEmbeddingProvider.ts
│   │
│   ├── qdrant/
│   │   ├── client.ts
│   │   └── collections.ts                                # student_features, job_features
│   │
│   ├── extract/
│   │   ├── pdfExtractor.ts                                 # pdf-parse wrapper
│   │   └── docxExtractor.ts                                 # mammoth wrapper
│   │
│   ├── storage/
│   │   └── s3Client.ts                                       # object storage (buildPlan §5.1)
│   │
│   ├── queue/
│   │   ├── connection.ts                                      # ioredis client
│   │   ├── queues.ts                                            # queue defs (buildPlan §58)
│   │   └── jobTypes.ts                                            # job payload types
│   │
│   ├── auth/
│   │   ├── config.ts                                              # NextAuth v5 options
│   │   ├── session.ts                                              # getServerSession helper
│   │   └── guard.ts                                                 # requireRole()
│   │
│   ├── config/
│   │   ├── env.ts                                                   # validated env (Zod)
│   │   ├── matchingDefaults.ts                                       # seed values for scoring-v1
│   │   └── degreeEquivalence.ts                                       # §0.5
│   │
│   └── logger.ts                                                       # Pino instance
│
├── workers/
│   ├── document-worker.ts                                               # RESUME_PROCESS, JD_PROCESS
│   └── matching-worker.ts                                                # MATCH_JOB
│
├── scripts/
│   ├── seed.ts
│   ├── reindex.ts
│   └── evaluate.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── evaluation/
│
└── docs/
    ├── agent-artifacts/<task-id>/
    └── BACKEND_ARCHITECTURE.md   (this file)
```

`lib/*` has no dependency on `next`. `workers/*` imports `lib/*` directly and
runs as a plain Node process (`tsx workers/document-worker.ts`), never inside
a Next.js request lifetime (`buildPlan.md` §92).

---

## 2. Layering rules

```text
app/api/*        → auth check → Zod-validate input → call ONE service method
                    → map result/error to response. No business logic here.

lib/services/*    → orchestration & business logic. Calls repositories, other
                    services, the matching engine, the queue. No Next.js
                    types (Request/Response) ever appear here.

lib/matching/*    → pure functions/classes. Given a StudentProfile, JobProfile,
                    ScoringConfig, and pre-fetched retrieval evidence, return
                    scores. No I/O — no Mongo calls, no Qdrant calls, no queue
                    calls. This is what makes matchers unit-testable with
                    plain object fixtures (AGENTS.md tdd-guide requirement).

lib/db/repositories/* → the ONLY place raw MongoDB queries exist. Return
                    domain types (mapped from _id etc.), never raw driver
                    documents, to callers.

lib/extraction/*,
lib/embeddings/*  → provider-abstracted (interface + per-vendor implementation),
                    selected by env var, never branched on inline elsewhere.

workers/*         → thin. Pull a job, call one service's pipeline function,
                    update status, let BullMQ retry on throw. Mirrors
                    buildPlan.md §59-§61 pseudocode almost verbatim.
```

---

## 3. Data layer

### 3.1 Repository method signatures

```ts
// userRepository.ts
findByEmail(email: string): Promise<User | null>
findById(id: string): Promise<User | null>
create(input: { email: string; name: string; passwordHash: string; role: UserRole }): Promise<User>

// resumeRepository.ts
create(input: { studentId: string; fileKey: string; originalName: string }): Promise<Resume>
updateStatus(resumeId: string, status: ResumeStatus, error?: { code: string; message: string }): Promise<void>
getActiveByStudent(studentId: string): Promise<Resume | null>
listByStudent(studentId: string): Promise<Resume[]>
get(resumeId: string): Promise<Resume | null>

// studentProfileRepository.ts
save(profile: StudentProfile, opts: { markActive: boolean }): Promise<void>
getActiveByStudent(studentId: string): Promise<StudentProfile | null>
listAllActive(): Promise<StudentProfile[]>   // V1: full population, no pre-filter (buildPlan §23)

// jobRepository.ts
create(input: { title: string; company?: string; fileKey: string; createdBy: string }): Promise<Job>
get(jobId: string): Promise<Job | null>
list(filter?: { archived?: boolean }): Promise<Job[]>
archive(jobId: string): Promise<void>
setPublishedRun(jobId: string, matchRunId: string): Promise<void>   // §113.2
clearPublishedRun(jobId: string): Promise<void>

// matchRunRepository.ts
create(input: { jobId: string; scoringConfigVersion: string; extractionModelVersion: string; embeddingModelVersion: string }): Promise<MatchRun>
updateStatus(runId: string, status: MatchRunStatus): Promise<void>
incrementProcessed(runId: string): Promise<void>
complete(runId: string): Promise<void>
get(runId: string): Promise<MatchRun | null>
listByJob(jobId: string): Promise<MatchRun[]>

// matchResultRepository.ts
upsert(result: MatchResult): Promise<void>   // keyed on (matchRunId, studentId)
listByRun(runId: string, filter?: { bucket?: FitBucket; minScore?: number; includeIneligible?: boolean }): Promise<MatchResult[]>
getByRunAndStudent(runId: string, studentId: string): Promise<MatchResult | null>
listPublishedForStudent(studentId: string): Promise<MatchResult[]>

// skillTaxonomyRepository.ts
list(opts?: { activeOnly?: boolean }): Promise<SkillTaxonomyEntry[]>
findByCanonicalOrAlias(name: string): Promise<SkillTaxonomyEntry | null>
create(entry: Omit<SkillTaxonomyEntry, "_id" | "createdAt" | "updatedAt">): Promise<SkillTaxonomyEntry>
update(id: string, patch: Partial<SkillTaxonomyEntry>): Promise<SkillTaxonomyEntry>
deactivate(id: string): Promise<void>   // soft-delete only, never hard-delete

// scoringConfigRepository.ts
getActive(): Promise<ScoringConfig>
getByVersion(version: string): Promise<ScoringConfig>
create(config: Omit<ScoringConfig, "_id" | "isActive" | "createdAt">): Promise<ScoringConfig>
activate(id: string): Promise<void>   // transaction: flip old active → false, new → true
listVersions(): Promise<ScoringConfig[]>

// auditLogRepository.ts
record(entry: { actorId: string; action: string; targetType: string; targetId: string; metadata?: Record<string, unknown> }): Promise<void>
```

### 3.2 Indexes

```text
users.email                                   unique
resumes.studentId, resumes.isActive            compound
studentProfiles.studentId, .isActive           compound
jobs.status
jobs.publishedMatchRunId
matchResults.matchRunId, .studentId            compound, UNIQUE (idempotency — §5)
matchResults.jobId, .bucket                    compound (bucket filtering/sorting)
skillTaxonomy.canonicalName                    unique
skillTaxonomy.aliases                          multikey
scoringConfigs.isActive                        (application-level invariant:
                                                 exactly one true, enforced via
                                                 the activate() transaction,
                                                 not a unique index — Mongo
                                                 can't express "at most one
                                                 true" as a unique constraint)
```

---

## 4. Provider abstractions

```ts
// lib/extraction/extractionProvider.ts
interface ExtractionProvider {
  readonly modelId: string;   // → StudentProfile.extractionMetadata.model, MatchRun.extractionModelVersion
  extractResume(text: string, promptVersion: string): Promise<unknown>;  // raw JSON; caller Zod-validates
  extractJD(text: string, promptVersion: string): Promise<unknown>;
}

// lib/embeddings/embeddingProvider.ts
interface EmbeddingProvider {
  readonly modelId: string;   // → MatchRun.embeddingModelVersion, Qdrant payload
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}
```

Selection happens once, in `lib/config/env.ts`:

```ts
function getExtractionProvider(): ExtractionProvider {
  switch (env.EXTRACTION_PROVIDER) {   // "gemini" | "claude"
    case "gemini": return new GeminiExtractionProvider();
    case "claude": return new ClaudeExtractionProvider();
  }
}
function getEmbeddingProvider(): EmbeddingProvider {
  switch (env.EMBEDDING_PROVIDER) {    // "gemini" | "openai"
    case "gemini": return new GeminiEmbeddingProvider();
    case "openai": return new OpenAIEmbeddingProvider();
  }
}
```

No other file imports `@google/generative-ai`, an Anthropic SDK, or an OpenAI
SDK directly — only these two provider implementation files do.

---

## 5. Service layer

Only the methods that matter for wiring are listed; trivial getters are
omitted.

```text
ResumeService
  uploadResume(studentId, file) → validates type/size (buildPlan §82),
    uploads to S3, creates Resume (UPLOADED), creates ProcessingJob,
    enqueues RESUME_PROCESS, returns { resumeId, status: "QUEUED" }
    — must return before extraction runs (buildPlan §16).
  getActiveResume(studentId), listResumes(studentId)

JobService
  uploadJob(adminId, file, meta) → mirrors uploadResume for JDs
  listStudentVisibleJobs(studentId) → jobs with a MatchResult for this
    student; redacts score/bucket/evidence unless
    job.publishedMatchRunId === result.matchRunId (§0.6)
  archiveJob(jobId)
  publishResults(jobId, matchRunId), hideResults(jobId) → §113.2, audit-logged

StudentService
  getOwnProfile(studentId), getStudentDetail(id) [admin], listStudents(page, limit) [admin]

ExtractionService
  extractResumeProfile(text) → provider.extractResume → Zod parse →
    evidenceVerifier.verify(each claim, text) → returns validated raw profile
    with per-claim verified/method flags (buildPlan §114)
  extractJobProfile(text) → analogous

EmbeddingService
  indexStudentProfile(profile) → builds feature texts (one per skill/project/
    experience entry), embeddingProvider.embed(), qdrantService.upsertStudentFeatures()
    with deterministic point IDs (buildPlan §56)
  indexJobProfile(profile) → analogous, job_features collection

QdrantService
  ensureCollections(), upsertStudentFeatures(points), upsertJobFeatures(points)
  searchSimilarStudentFeatures(vector, filter, topK) → used by projectMatcher/
    skillMatcher's semantic layer

MatchingService
  startMatchRun(jobId) → resolves active ScoringConfig + active extraction/
    embedding model ids, creates MatchRun (QUEUED) with those pinned (§0.4),
    enqueues MATCH_JOB, returns { matchRunId }
  runMatch(matchRunId) → worker-facing, see §7 pipeline below

SkillTaxonomyService
  canonicalize(rawSkillName) → resolves exact/alias match against taxonomy,
    used by the resume/JD normalization step, not just the matcher
  listSkills(), createSkill(), updateSkill(), deactivateSkill()

ScoringConfigService
  getActive(), createVersion(weights, buckets, thresholds, mandatoryPenalty)
    → validates weights sum to 1.0 ± 0.01, activateVersion(id) [transactional]

AuditService
  record(actorId, action, targetType, targetId, metadata?)
```

---

## 6. Matching engine — algorithms

`matchingEngine.evaluate(student, job, config, retrievedEvidence)` runs this
exact pipeline (extends `buildPlan.md` §22/§62/§63):

**6.1 Eligibility gate** (`eligibilityEngine.ts`)
Check every `JobConstraint`, `EducationRequirement`, `ExperienceRequirement`
where `disqualifying: true`. Any failure → `eligible: false` with the specific
reason(s) recorded. Evaluation continues regardless (§0.3) — this does not
short-circuit the rest of the pipeline.

**6.2 Skill matching** (`skillMatcher.ts`)
For each `Requirement` in `requiredSkills` + `preferredSkills`:
1. Canonicalize the requirement name via `skillTaxonomyService`.
2. Exact canonical match against student skills → `1.0`.
3. Else alias match via taxonomy → `1.0`.
4. Else semantic match: look up this requirement's retrieved evidence
   (pre-fetched by `MatchingService` from Qdrant), apply thresholds from
   `config.semanticThresholds` (`strong ≥ 0.85`, `possible ≥ 0.75`, else `0`).
5. Weight into the category score by `importance` (`MANDATORY=4, HIGH=3,
   MEDIUM=2, LOW=1`) as a weighted mean across all requirements.
6. Any requirement scoring below `possible` with `importance ≥ MEDIUM` →
   added to `missingRequirements`.

**6.3 Experience matching** (`experienceMatcher.ts`)
`ratio = min(1, totalRelevantExperienceMonths / requiredExperience.minMonths)`.
If `requiredExperience.domain` is set, `totalRelevantExperienceMonths` only
counts months from `Experience` entries whose technologies/description
semantically match that domain (via retrieved evidence) — not all experience
indiscriminately (buildPlan §28's "interpret according to requirement
semantics").

**6.4 Project matching** (`projectMatcher.ts`)
For each `responsibility` / `SemanticRequirement`: retrieve top-k student
projects from Qdrant (pre-fetched), take the best match, apply the same
strong/possible thresholds, weight by `importance`. Evidence includes the
matched project's title + the specific snippet that matched.

**6.5 Education matching** (`educationMatcher.ts`)
Deterministic: degree in `EducationRequirement.degree` (via
`degreeEquivalence.ts`, §0.5) AND field in `.field` (fuzzy/taxonomy-based,
allowing explicitly-whitelisted adjacency like IT ⊆ "Computer Science / IT")
AND `cgpa ≥ minCgpa` if set → `1.0`; otherwise partial credit only for
whitelisted adjacent-field cases, else `0`.

**6.6 Other/requirement matching** (`requirementMatcher.ts`)
Certifications, achievements, coursework matched against any remaining
`SemanticRequirement`s not already covered by skill/project matching. Feeds
the "Other Evidence" 5% category (buildPlan §31).

**6.7 Score aggregation** (`scoreAggregator.ts`)
```text
hardRequirementScore = weighted score over disqualifying:false constraints
                        (defaults to 100 if none exist — §0.1)
finalScore =
    hardRequirementScore * config.weights.hardRequirements
  + skillScore            * config.weights.skills
  + experienceScore       * config.weights.experience
  + projectScore          * config.weights.projects
  + educationScore        * config.weights.education
  + otherScore            * config.weights.other
```

**6.8 Mandatory penalty** (`penaltyEngine.ts`)
If any `Requirement` with `importance: "MANDATORY"` scored `0` in §6.2 (a true
miss, not merely low-semantic), apply `finalScore *= config.mandatoryPenalty`
**once**, regardless of how many mandatory skills were missed (§0.2).

**6.9 Bucketing** (`bucketEngine.ts`)
`config.buckets` thresholds → `BEST_FIT` / `MODERATE_FIT` / `LOW_FIT`, applied
even when `eligible: false`, for transparency (§0.3).

**6.10 Confidence** (`confidenceEngine.ts`), per buildPlan §35/§36:
- `extractionQuality`: from the student's resume text-quality check + whether
  extraction completed without `needs_review` flags.
- `evidenceCoverage` (weight .30): % of claims verified `EXACT`/`FUZZY` (§114)
  vs `UNVERIFIED`, across all evidence used in this match.
- `matchingClarity` (weight .25): semantic margin — top-1 vs top-2 retrieved
  evidence score gap, per requirement, averaged.
- `informationCompleteness` (weight .15): % of expected profile sections
  (skills/projects/experience/education) that are non-empty.
- `deterministicCoverage` (weight .10): % of the final score that came from
  `EXACT`/alias matches vs semantic ones.

**6.11 Assemble** `MatchEvaluation { score, confidence, bucket, eligible,
categoryScores, evidence[], missingRequirements[] }` → `MatchingService`
converts this into a `MatchResult` document (extends buildPlan §38 with the
`eligible: boolean` field from §0.3).

---

## 7. Workers & queues

```text
Queues (BullMQ):
  document-processing   { type: "RESUME_PROCESS", resumeId }
                         { type: "JD_PROCESS", jobId }
                         concurrency: 3 (LLM-rate-limit friendly)
  matching               { type: "MATCH_JOB", matchRunId }
                         concurrency: 2 (parallel runs), 1 worker per run internally

Retry: attempts = 3, exponential backoff, base 5s (buildPlan §57).
```

**Idempotency** (buildPlan §56):
- `document-worker`: keyed by `resumeId` + `profileVersion`; Qdrant point IDs
  are deterministic (`student:{studentId}:resume:{resumeId}:project:{projectId}`),
  so a retried/duplicated job upserts rather than duplicates vectors.
- `matching-worker`: `matchResultRepository.upsert` is keyed on the unique
  `(matchRunId, studentId)` compound index — a retried job after partial
  failure overwrites, never duplicates.

```ts
// workers/document-worker.ts — processResume(resumeId)
const resume = await resumeRepository.get(resumeId);
await resumeRepository.updateStatus(resumeId, "EXTRACTING");
const buffer = await s3Client.download(resume.fileKey);
const text = resume.mimeType === "application/pdf"
  ? await pdfExtractor.extract(buffer)
  : await docxExtractor.extract(buffer);
const quality = textQuality.check(text);
if (quality.insufficient) {
  await resumeRepository.updateStatus(resumeId, "FAILED", { code: "NEEDS_OCR", message: "..." });
  return;
}
await resumeRepository.updateStatus(resumeId, "STRUCTURING");
const raw = await extractionService.extractResumeProfile(text);
const profile = await normalizeProfile(raw, skillTaxonomyService); // canonicalize + dedupe
await resumeRepository.updateStatus(resumeId, "VALIDATING");
studentProfileSchema.parse(profile); // Zod
await studentProfileRepository.save(profile, { markActive: true });
await resumeRepository.updateStatus(resumeId, "INDEXING");
await embeddingService.indexStudentProfile(profile);
await resumeRepository.updateStatus(resumeId, "READY");
// any throw above → resumeRepository.updateStatus(resumeId, "FAILED", {...}); rethrow for BullMQ retry
```

```ts
// workers/matching-worker.ts — processMatchRun(matchRunId)
const run = await matchRunRepository.get(matchRunId);
const job = await jobRepository.get(run.jobId);
const jobProfile = await jobProfileRepository.get(run.jobId);
const config = await scoringConfigRepository.getByVersion(run.scoringConfigVersion); // §0.4, not getActive()
const students = await studentProfileRepository.listAllActive(); // V1: full ~500, no pre-filter (buildPlan §23, §117)
await matchRunRepository.updateStatus(runId, "RUNNING");
for (const student of students) {
  const retrievedEvidence = await qdrantService.retrieveForStudentAgainstJob(student, jobProfile);
  const evaluation = matchingEngine.evaluate(student, jobProfile, config, retrievedEvidence);
  await matchResultRepository.upsert(toMatchResult(run, student, evaluation));
  await matchRunRepository.incrementProcessed(runId);
}
await matchRunRepository.complete(runId);
```

---

## 8. API contracts (representative examples)

Every other route in §1's tree follows the same shape: auth → Zod-validate →
one service call → response.

```text
POST /api/resumes
  auth: STUDENT
  body: multipart/form-data { file }
  → resumeService.uploadResume(session.userId, file)
  200 { resumeId, status: "QUEUED" }
  400 invalid file type/size · 401 unauthenticated

POST /api/admin/jobs/:id/match
  auth: ADMIN
  → matchingService.startMatchRun(params.id)
  202 { matchRunId, status: "QUEUED" }
  404 job not found · 409 job not READY yet

POST /api/admin/jobs/:id/publish-results
  auth: ADMIN
  body: { matchRunId }
  → jobService.publishResults(params.id, body.matchRunId); auditService.record(...)
  200 { jobId, publishedMatchRunId, publishedAt }
  400 matchRunId not COMPLETED · 404 job not found

GET /api/matches
  auth: STUDENT
  → matchResultRepository.listPublishedForStudent(session.userId)
  200 { results: MatchResult[] }   // only for jobs where publishedMatchRunId is set
```

---

## 9. Auth & guard pattern

```ts
// lib/auth/guard.ts
async function requireRole(role: "STUDENT" | "ADMIN"): Promise<Session> {
  const session = await getServerSession();
  if (!session) throw new UnauthorizedError();
  if (session.user.role !== role) throw new ForbiddenError();
  return session;
}
```
Every route handler's first line is a `requireRole(...)` call. Role is read
from the server-side session (backed by the `users` document), never from a
request body/header/cookie value (buildPlan §5.6, §81).

---

## 10. Config & environment

`lib/config/env.ts` validates all required env vars with Zod at process boot
(both Next.js and each worker entrypoint) — fail fast rather than surfacing a
runtime error deep in a request/job (per global security guidance: "validate
that required secrets are present at startup").

```text
MONGODB_URI, REDIS_URL, QDRANT_URL, QDRANT_API_KEY,
S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY,
EXTRACTION_PROVIDER=gemini|claude, EMBEDDING_PROVIDER=gemini|openai,
GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY,
AUTH_SECRET
```

---

## 11. Observability

`lib/logger.ts` wraps Pino. Every log call in a request handler or worker job
includes `requestId`/`jobId` and `studentId` (where the caller is authorized
to see it) — never a full resume/JD text body (buildPlan §79).
