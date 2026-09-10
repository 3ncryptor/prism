import { Queue } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import type { DocumentProcessingJobPayload, MatchingJobPayload } from "@/lib/queue/jobTypes";

let cachedQueue: Queue<DocumentProcessingJobPayload> | null = null;
let cachedMatchingQueue: Queue<MatchingJobPayload> | null = null;

/**
 * Without removeOnComplete/removeOnFail, BullMQ keeps every job's data in
 * Redis forever by default — every resume/JD upload and match run would
 * grow Redis memory unboundedly over months of real usage. Safe to trim
 * aggressively here: job outcomes are already durably persisted in Mongo
 * (Resume/Job/MatchRun documents), so the BullMQ job record itself is only
 * needed briefly for processing plus a short window for debugging.
 */
const JOB_RETENTION = {
  removeOnComplete: { age: 24 * 60 * 60, count: 500 },
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 1000 },
};

/** buildPlan.md §58. Concurrency (3, LLM-rate-limit friendly) is a worker-side (feature #7) option. */
export function getDocumentProcessingQueue(): Queue<DocumentProcessingJobPayload> {
  if (cachedQueue) return cachedQueue;
  cachedQueue = new Queue<DocumentProcessingJobPayload>("document-processing", {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 }, // buildPlan.md §57
      ...JOB_RETENTION,
    },
  });
  return cachedQueue;
}

/** BACKEND_ARCHITECTURE.md §7: concurrency 2 (parallel runs), retry policy same as document-processing. */
export function getMatchingQueue(): Queue<MatchingJobPayload> {
  if (cachedMatchingQueue) return cachedMatchingQueue;
  cachedMatchingQueue = new Queue<MatchingJobPayload>("matching", {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      ...JOB_RETENTION,
    },
  });
  return cachedMatchingQueue;
}

/** Test-only escape hatch. */
export function resetDocumentProcessingQueueForTests(): void {
  cachedQueue = null;
  cachedMatchingQueue = null;
}
