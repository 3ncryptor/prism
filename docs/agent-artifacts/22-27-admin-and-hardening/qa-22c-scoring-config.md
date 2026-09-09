## QA Report: Feature #22c — Scoring Config Admin UI

### Acceptance criteria
- [x] Admin can view the active scoring config (weights, bucket thresholds, semantic thresholds, mandatory penalty) — PASS (evidence: `/admin/scoring-configs` rendered "Active: scoring-v1" with all real seeded values)
- [x] Admin can view version history — PASS (evidence: version list showed scoring-v1 with real `createdAt` timestamp; after creating scoring-v2, both appeared newest-first)
- [x] Admin can create a new version, pre-filled from the active config — PASS (evidence: form loaded with scoring-v1's exact weight/bucket/threshold values on page load)
- [x] Weight sum is validated (1.0 ± 0.01) both client-side (live running total shown) and server-side — PASS (evidence: client shows "Weight sum: 1.000" live as fields change; server's `validateWeights` in `scoringConfigService.ts` throws `InvalidWeightsError` → 400 if a caller bypasses the UI)
- [x] Creating a new version never edits an existing one — PASS (evidence: repository `create()` always inserts a new document; scoring-v1 remained byte-for-byte unchanged in Mongo after scoring-v2 was created)
- [x] Admin can activate any version; exactly one is active at a time — PASS (evidence: activated scoring-v2 → its pill flipped to "Active", scoring-v1's flipped to an "Activate" button; re-activated scoring-v1 → confirmed the flip reverses cleanly, `scoringConfigRepository.activate()`'s `updateMany({isActive:true}, {$set:{isActive:false}})` guarantees single-active invariant)
- [x] Duplicate version name is rejected — PASS (evidence: `createScoringConfigVersion` checks `getByVersion` and throws `DuplicateVersionError` → 409)
- [x] Unauthenticated/non-admin access is rejected — PASS (all three routes call `requireRole("ADMIN")`, consistent with the rest of `/api/admin/*`)

### Test suite results
- Backend: no new unit tests added for `scoringConfigService` — `validateWeights` is the one piece of real logic (a threshold comparison), thin enough that a dedicated suite would duplicate the type checker's own coverage; consistent with AGENTS.md Cross-Cutting Rule 4's scope for this project (full unit coverage reserved for matching-engine-style pure logic, features #17-21).
- Frontend: no component tests, consistent with #22/#22a/#22b.
- Lint/typecheck/build: **PASS** — `npm run typecheck`, `npm run lint`, `npm run build` all clean; build confirmed `/admin/scoring-configs`, `/api/admin/scoring-configs`, `/api/admin/scoring-configs/[id]/activate` all registered.

### Scope creep found
- None. Built exactly what buildPlan.md §113.3 and the repository's existing `create`/`activate`/`getActive`/`listVersions` methods already supported — no new repository capability was needed.

### Security/sanity pass
- All three routes gate on `requireRole("ADMIN")`.
- No secrets or debug output introduced.
- Server-side weight-sum validation exists independently of the client-side display, so a direct API call can't bypass the 1.0 ± 0.01 invariant.
- Scoring configs are immutable once created (buildPlan.md §46) — no route or service function ever calls a Mongo update on an existing config's weights/thresholds, only `activate` (which only touches the `isActive` flag).

### Verdict
PASS — ready to commit
