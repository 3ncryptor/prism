## Backend Handoff: Queue

### What was built
- `lib/queue/connection.ts`: ioredis connection (`getRedisConnection`),
  plus `closeRedisConnection()` for clean shutdown (see Deviations).
- `lib/queue/jobTypes.ts`, `lib/queue/queues.ts`:
  `getDocumentProcessingQueue()` (BullMQ `Queue`, 3 retries, exponential
  backoff per buildPlan.md §57).
- `lib/services/queueService.ts`: `enqueueDocumentProcessing(payload)`.
- `resumeService.uploadResume` now actually calls
  `enqueueDocumentProcessing` after creating the `ProcessingJob` record —
  closes the gap explicitly left open in feature #5.

### Deviations
Found and fixed a real bug while testing: `BullMQ`'s `Queue.close()` does
**not** close a Redis connection it was handed externally (only ones it
creates itself) — the shared `ioredis` client stayed open, which would
have kept a real worker process alive forever with a dangling connection
(and made this integration test hang indefinitely rather than fail
loudly). Added `closeRedisConnection()`, called explicitly in the test's
`afterAll`, and noted for feature #7's worker shutdown handling.

### Tests written
`tests/integration/queue/queueService.docker.test.ts` — 1 test against a
real Redis container: enqueues a real job, verifies it's actually waiting
on the BullMQ queue with the correct payload and retry config.
`tests/integration/redisContainer.ts` — same Docker-driven pattern as
Mongo/MinIO.

`resumeService.test.ts` updated: the existing happy-path test now also
asserts `enqueueDocumentProcessing` is called with the right payload.

### How to run
Same as before (Docker running). All green: 45/45 tests, lint, typecheck,
build — and the test suite now exits cleanly (no more hung processes).

### Known limitations / things Frontend needs to know
No frontend work (infrastructure only). Jobs are queued but nothing
consumes them yet — feature #7 (worker) is next.
