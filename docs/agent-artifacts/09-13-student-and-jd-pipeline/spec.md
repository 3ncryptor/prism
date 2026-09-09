## Task: Features 9-13 (batched — Student Profile, Student Dashboard, JD
Upload, JD Worker, Skill Taxonomy)

Batched per explicit user instruction ("they are all similar"). Each still
gets its own commit; this doc covers all five since they share context.

### 9. Student Profile (API)
`GET /api/profile` — STUDENT-only, returns own active `StudentProfile` +
active `Resume` status. No new schema (already exists, feature #3).

### 10. Student Dashboard (Frontend — first real Grauity usage)
Replaces the feature #2 placeholder at `/student`: resume status, upload
form, extracted skills/projects/experience/education. **No "applications"
section yet** — that needs match results, which don't exist until feature
#21+; showing an empty section now would be dead UI, not a real feature.
Uses `@newtonschool/grauity` (user-specified component library) — first
integration in this codebase, so this feature also does the one-time
Next.js wiring (ThemeProvider, styled-components SSR config).

### 11. JD Upload (Backend, mirrors feature #5)
`lib/services/jobService.ts`: `uploadJob` (validate → S3 → `Job` record →
`ProcessingJob` → enqueue `JD_PROCESS`). `app/api/admin/jobs/route.ts`:
POST/GET, ADMIN-only. `jobRepository` already exists (feature #3); adding
`updateStatus` (missing from the original set).

### 12. JD Worker (Backend, mirrors features #7+#8 for JD)
Extends `workers/document-worker.ts`'s already-stubbed `JD_PROCESS`
branch: same extract → quality-check → LLM-structure → validate → READY
pipeline as resumes, producing a `JobProfile` instead of a
`StudentProfile`. `ExtractionProvider` gains `extractJD`; a new
`jd-extraction-v1` prompt. **No evidence-verification filtering for JD
claims** (unlike resumes) — the JD is the admin's own source-of-truth
document, not a claim needing grounding against itself; buildPlan.md §20's
hallucination protection is specifically about resume claims.

### 13. Skill Taxonomy
`lib/schemas/skillTaxonomy.ts`, `skillTaxonomyRepository`,
`skillTaxonomyService.canonicalize()` per buildPlan.md §113.3/§26. Wired
into `normalizeProfile.ts`, replacing its placeholder
lowercase-only canonicalization. Seed data: ~40 curated skills common in
university placements (buildPlan.md §99). **No admin CRUD UI** — that's
feature #22b.

### Explicit scope boundaries (all five)
- No embedding/indexing anywhere yet (feature #14+).
- No matching logic (feature #17+).
- Per the current testing policy (buildPlan.md §118 addendum #13): tests
  for deterministic logic (taxonomy canonicalization matching, job status
  transitions) — not exhaustive suites for LLM-output-quality-dependent
  paths, consistent with feature #8's precedent.

### Acceptance criteria (condensed)
- [ ] `GET /api/profile` returns the student's own profile, 401/403
      enforced
- [ ] `/student` renders real data (not the placeholder), upload form
      works against the real API
- [ ] `POST /api/admin/jobs` uploads a JD the same way resumes upload
- [ ] JD worker reaches `READY` with a validated `JobProfile` on a
      successful run (verified via mocked deps, same pattern as
      `documentWorker.test.ts`)
- [ ] `skillTaxonomyService.canonicalize("NodeJS")` resolves to `"node.js"`
      via the seeded alias table
- [ ] `npm run build`, `npm run lint`, `npm run typecheck` all pass for
      every one of the five
