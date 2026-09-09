import { Queue } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import type { DocumentProcessingJobPayload, MatchingJobPayload } from "@/lib/queue/jobTypes";

let cachedQueue: Queue<DocumentProcessingJobPayload> | null = null;
let cachedMatchingQueue: Queue<MatchingJobPayload> | null = null;

/** buildPlan.md §58. Concurrency (3, LLM-rate-limit friendly) is a worker-side (feature #7) option. */
export function getDocumentProcessingQueue(): Queue<DocumentProcessingJobPayload> {
  if (cachedQueue) return cachedQueue;
  cachedQueue = new Queue<DocumentProcessingJobPayload>("document-processing", {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 }, // buildPlan.md §57
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
    },
  });
  return cachedMatchingQueue;
}

/** Test-only escape hatch. */
export function resetDocumentProcessingQueueForTests(): void {
  cachedQueue = null;
  cachedMatchingQueue = null;
}
