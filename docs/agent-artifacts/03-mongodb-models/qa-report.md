## QA Report: MongoDB Models

### Acceptance criteria
- [x] All 5 repositories pass real-MongoDB (Docker) integration tests —
      PASS (`repositories.docker.test.ts`, 6 tests, real `mongo:7.0`
      container, every listed method exercised).
- [x] Zod schemas match buildPlan.md's interfaces + §113.1 exactly — PASS,
      verified by direct comparison against §9-§14/§113.1 while writing.
- [x] Indexes match `docs/BACKEND_ARCHITECTURE.md` §3.2 — PASS, verified by
      `listIndexes()` assertions in the Docker test.
- [x] `npm run build`, `npm run lint`, `npm test` all pass — PASS (36/36
      tests, lint clean, typecheck clean, build clean).

### Test suite results
- Unit (fake-based, from features #1-#2): 30 tests, all passing.
- Integration (real Docker MongoDB): 6 new tests (repositories.docker) + 2
  existing (userRepository.docker), all passing.
- Lint/typecheck/build: clean.

### Scope creep check
The `mongodb@7.6.0 → 6.21.0` downgrade and the `testcontainers` →
hand-rolled Docker helper swap are both disclosed, both necessary fixes
(a real driver bug and a Node-version incompatibility respectively), not
speculative additions. The documented "no `students` collection" decision
in spec.md is a scope-narrowing (doing less than a literal reading of
buildPlan.md §53 might suggest), not creep, and is justified by the absence
of any concrete `Student` shape in the spec.

### Security/sanity pass
- No secrets involved (schema/repository layer only).
- No `console.log`; repositories throw/return `null` per existing
  conventions, consistent with feature #2's repositories.
- Docker container cleanup verified: `docker ps -a --filter ancestor=mongo:7.0`
  confirmed empty after the test run (one leftover container from an
  earlier failed run, before the driver fix, was found and stopped).

### Verdict
**PASS.**
