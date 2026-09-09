## Task: Queue

### Goal
Redis + BullMQ queue infrastructure, per `buildPlan.md` §5.2, §58. Wires
the resume-upload flow (feature #5) to actually enqueue processing — it
previously left `ProcessingJob` records `QUEUED` with no dispatch, since
nothing consumed them yet.

### In scope
- `lib/queue/connection.ts`: ioredis connection (via `getRedisUrl()`).
- `lib/queue/jobTypes.ts`: `DocumentProcessingJobPayload` (`RESUME_PROCESS`
  | `JD_PROCESS`).
- `lib/queue/queues.ts`: `documentProcessingQueue` (BullMQ `Queue`),
  concurrency handled on the worker side (feature #7) — this feature only
  defines and enqueues onto it.
- `lib/services/queueService.ts`: `enqueueDocumentProcessing(payload)`.
- Wire `resumeService.uploadResume` to actually call
  `enqueueDocumentProcessing` (closing the gap explicitly left open in
  feature #5's handoff).
- Real Redis integration testing via Docker (buildPlan.md §93 exception,
  same pattern as features #3/#4).

### Out of scope
- The `matching` queue (not needed until feature #17+; adding it now would
  be speculative).
- Any actual worker/consumer (feature #7) — this feature only produces
  jobs onto the queue, nothing consumes them yet.

### Acceptance Criteria
- [ ] `enqueueDocumentProcessing` actually adds a job to a real Redis-backed
      BullMQ queue (verified via `Queue.getJobCounts`/`getJob`)
- [ ] `uploadResume` now enqueues a `RESUME_PROCESS` job with the correct
      `resumeId` after creating the `ProcessingJob` record
- [ ] `npm run build`, `npm run lint`, `npm test` all pass
