## Backend Handoff: MongoDB Models

### What was built
- Schemas: `lib/schemas/{resume,job,jobProfile,studentProfile,processingJob}.ts`
  — match buildPlan.md §9-§14, §113.1 exactly.
- Repositories: `resumeRepository`, `studentProfileRepository`,
  `jobRepository`, `jobProfileRepository`, `processingJobRepository` — same
  injected-`getCollection` pattern as `userRepository` (feature #2).
- `lib/db/indexes.ts`: `ensureIndexes(db)`, called from `scripts/seed.ts`.
- Real MongoDB-in-Docker integration testing: `tests/integration/mongoContainer.ts`
  (driven directly via the `docker` CLI, not `testcontainers` — see
  Deviations) + `tests/integration/db/repositories.docker.test.ts` (one
  shared container for all 5 repositories + index verification).

### Deviations
- **`testcontainers` tried and dropped.** Its bundled `undici` requires
  Node >= 22; this environment runs Node 20.20.2, which threw
  `webidl.util.markAsUncloneable is not a function` immediately. Replaced
  with a ~50-line hand-rolled helper driving `docker run`/`docker port`/
  `docker stop` directly — no new dependency, same effect.
- **Found and fixed a real `mongodb` driver bug**, not just a test
  problem: `mongodb@7.6.0` fails ALL connections in this environment
  (confirmed against both `mongodb-memory-server` and a real official
  `mongo:7.0` Docker image) with `MongoServerSelectionError: Missing
  required sub-document 'driver' in the client metadata document` — a
  driver-side handshake bug, not a server compatibility issue. Downgraded
  to `mongodb@6.21.0`, which works cleanly. **This would have broken the
  real Atlas connection in production too** — good that it surfaced now
  during test setup rather than later.
- **No `students` collection** — see spec.md's documented assumption
  (no concrete `Student` shape exists anywhere in buildPlan.md; `User` +
  `StudentProfile` cover what's actually specified).

### Tests written
`tests/integration/db/repositories.docker.test.ts` — 6 tests against a real
MongoDB 7.0 Docker container: index verification, and one test per
repository covering every method in spec.md's acceptance criteria list.
Plus the existing `userRepository.docker.test.ts` from validating the
Docker approach.

### How to run
Same as before, plus: integration tests now require Docker running
(`docker info` must succeed) — they were included in this run. All green:
lint, typecheck, build, 36/36 tests (30 unit/fake-based + 6 real-Docker).

### Known limitations / things Frontend needs to know
No frontend work in this feature (schema/repository only, per spec.md's
explicit scope). Nothing yet populates these collections — that starts
with feature #4 (object storage) / #5 (resume upload).
