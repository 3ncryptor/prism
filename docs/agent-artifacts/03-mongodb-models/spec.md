## Task: MongoDB Models

### Goal
Define schemas + repositories for the core domain collections beyond
`users` (built in feature #2): `resumes`, `studentProfiles`, `jobs`,
`jobProfiles`, `processingJobs` — per `buildPlan.md` §8-§14, §113.1, §53.
This unblocks features #4 (object storage), #5 (resume upload), #7 (resume
worker), #9 (student profile), #11+ (JD pipeline) without redoing schema
work.

### In scope
- Zod schemas: `Resume`+`ResumeStatus` (§17), `ProcessingJob` (§17),
  `StudentProfile`+`Skill`/`Project`/`Experience`/`Education`/
  `Certification`/`Achievement` (§9-§12), `Job` (JD lifecycle entity, with
  `publishedMatchRunId`/`publishedAt` per §113.2), `JobProfile`+
  `Requirement`/`JobConstraint`/`EducationRequirement`/
  `ExperienceRequirement`/`SemanticRequirement` (§13-§14, §113.1).
- Repositories, methods scoped to what `docs/BACKEND_ARCHITECTURE.md` §3.1
  and near-term features actually need (not exhaustive CRUD): 
  `resumeRepository` (create, updateStatus, getActiveByStudent,
  listByStudent, get), `studentProfileRepository` (save, getActiveByStudent,
  listAllActive), `jobRepository` (create, get, list, archive,
  setPublishedRun, clearPublishedRun), `jobProfileRepository` (save, get),
  `processingJobRepository` (create, updateStatus, get).
- `lib/db/indexes.ts`: index creation per `docs/BACKEND_ARCHITECTURE.md`
  §3.2 for the new collections.
- Real integration tests against MongoDB running in Docker (per your
  instruction — `tests/integration/mongoContainer.ts`, already validated
  against `userRepository` this session).

### Explicit assumption (flagging, not asking — cheap to reverse)
`buildPlan.md` §53 lists a `students` collection separately from `users`,
but no `Student` interface is defined anywhere in the doc — only `User`
(§8) and `StudentProfile` (§9, the *extracted resume content*, not
identity/enrollment data). Since no concrete shape exists, this feature
does **not** create a separate `students` collection; `User` (role=STUDENT)
is identity, `StudentProfile` is resume-derived data, keyed by `studentId`
(= the User's `_id`). Add a real `students` collection later only if a
feature needs enrollment metadata (branch, graduation year, roster import)
that doesn't fit either existing collection.

### Out of scope
- `matchRuns`, `matchResults`, `auditLogs`, `skillTaxonomy`,
  `scoringConfigs` — each arrives with its own feature (#13, #17-#22).
- Anything that populates these collections (extraction, upload, worker
  pipelines) — later features. This is schema + repository only.

### Acceptance Criteria
- [ ] All 5 repositories pass real-MongoDB (Docker) integration tests for
      every method listed above
- [ ] Zod schemas match buildPlan.md's interfaces + the §113.1 additions
      exactly (no invented fields beyond what's specified)
- [ ] Indexes created match `docs/BACKEND_ARCHITECTURE.md` §3.2
- [ ] `npm run build`, `npm run lint`, `npm test` all pass
