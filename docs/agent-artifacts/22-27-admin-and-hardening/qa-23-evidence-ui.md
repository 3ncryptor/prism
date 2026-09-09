## QA Report: Feature #23 — Evidence UI

### Acceptance criteria
- [x] Admin result table shows an expandable "View evidence" action per row — PASS (evidence: clicked on Student Three's Best Fit row in the Machine Learning Engineer job detail page; expanded to show all 7 real evidence entries — 3 skill matches, 1 experience match, 2 project matches (one 0.79, one 0.00 "No matching project found"), 1 education match)
- [x] Student published-application view shows the same evidence — PASS (evidence: signed in as student3@prism.dev, `/student`'s Applications section showed "View evidence" for the published Machine Learning Engineer application; expanded content byte-for-byte matched the admin view — same skill/experience/project/education entries, same scores and reasons)
- [x] Evidence is never shown for an under-review (unpublished) application — PASS (evidence: `PublishedApplication`/`UnderReviewApplication` remain a discriminated union in `/api/matches`; `evidence` only exists on the `published` branch, and the UI only renders the evidence toggle when `application.status === "published"`)
- [x] Evidence rendering (category, requirement, matched text, source type, score, reason) is identical between admin and student surfaces — PASS (both consume the same shared `EvidenceList` component)

### Test suite results
- Backend: no new unit tests — `evidence` was already fully typed and persisted by the matching engine (features #17-21, already covered by that suite); this feature only threads an existing field through two read paths, no new business logic.
- Frontend: no component tests, consistent with #22/#22a/#22b/#22c.
- Lint/typecheck/build: **PASS** — `npm run typecheck`, `npm run lint`, `npm run build` all clean.

### Scope creep found
- None. `MatchResult.evidence` already existed from feature #17-21; this feature only exposes it in the UI, on both surfaces the spec calls for.

### Security/sanity pass
- No new routes — reused the existing authenticated `/api/admin/jobs/:id/results` (ADMIN-gated) and `/api/matches` (STUDENT-gated, scoped to `session.user.id`) endpoints.
- No secrets or debug output introduced.
- `EvidenceList` is a pure presentational component with no I/O.

### Verdict
PASS — ready to commit
