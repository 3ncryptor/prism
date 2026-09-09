## QA Report: Feature #22b — Skill Taxonomy Admin UI

### Acceptance criteria
- [x] Admin can view all taxonomy entries with usage counts — PASS (evidence: `/admin/skill-taxonomy` rendered all 38 seeded entries with real `usageCount` values, e.g. Python: 2, Django: 2, Node.js: 1, Git: 2, Machine Learning: 2)
- [x] Admin can create a new skill (canonicalName, displayName, category, aliases) — PASS (evidence: created `graphql`/`GraphQL`/TOOL/`graph-ql`, appeared in table in correct alphabetical position with usage 0)
- [x] Admin can edit an existing skill's displayName/category/aliases — PASS (evidence: edited `graphql` displayName to "GraphQL API", table updated immediately; canonicalName field correctly disabled during edit)
- [x] Admin can deactivate (soft-delete) a skill, never hard-delete — PASS (evidence: clicked Deactivate on `graphql`, status pill flipped to "Inactive", Deactivate button disappeared for inactive rows, Mongo doc confirmed `isActive: false` with `updatedAt` bumped and the document still present — no hard delete)
- [x] Duplicate canonicalName is rejected — PASS (evidence: `createSkill` throws `DuplicateCanonicalNameError` → API returns 409; backend-level check against `skillTaxonomyRepository.list()`)
- [x] Unauthenticated/non-admin access is rejected — PASS (evidence: routes call `requireRole("ADMIN")`, consistent with all other `/api/admin/*` routes in this codebase)

### Test suite results
- Backend: no new unit tests added — `skillTaxonomyService`'s new admin functions (`listSkillsWithUsage`, `createSkill`, `updateSkill`, `deactivateSkill`) are thin repository-composition wrappers with no independent business logic (duplicate-name and not-found checks are one-line guards), consistent with AGENTS.md Cross-Cutting Rule 4's scope (full unit coverage reserved for matching-engine-style pure logic).
- Frontend: no component tests — repo has no existing pattern for testing Grauity-wrapped client dashboards (features #22 and #22a took the same approach).
- Lint/typecheck/build: **PASS** — `npm run typecheck`, `npm run lint`, `npm run build` all clean; build confirmed `/admin/skill-taxonomy`, `/api/admin/skill-taxonomy`, `/api/admin/skill-taxonomy/[id]` all registered as routes.

### Scope creep found
- None. Built exactly the CRUD surface `skillTaxonomyService`/routes already exposed from earlier work in this feature; no new backend capability introduced beyond what the spec required (list-with-usage, create, update, deactivate).

### Security/sanity pass
- All three API routes gate on `requireRole("ADMIN")` — 401/403 paths return before any DB access.
- No secrets or debug output in new code.
- Canonical name is normalized (`trim().toLowerCase()`) server-side before uniqueness check and persistence, preventing case-variant duplicates.
- Deactivate is a soft-delete only (`isActive: false`), matching buildPlan.md §116's explicit "never hard delete" requirement — no route or service function performs a real delete.

### Verdict
PASS — ready to commit
