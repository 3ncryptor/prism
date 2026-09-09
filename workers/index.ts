import "@/lib/config/loadEnv";
import { closeRedisConnection } from "@/lib/queue/connection";
import { closeMongoConnection } from "@/lib/db/client";
import { startDocumentWorker } from "@/workers/document-worker";
import { startMatchingWorker } from "@/workers/matching-worker";
import { logger } from "@/lib/logger";

/**
 * buildPlan.md §58: "one worker process can consume multiple queues if
 * infrastructure simplicity is preferred" — this is that: both workers
 * (document-processing, matching) run in one Node process/container, kept
 * as separate modules for code organization per
 * docs/BACKEND_ARCHITECTURE.md's file tree.
 */
const documentWorker = startDocumentWorker();
const matchingWorker = startMatchingWorker();
logger.info("Document worker and matching worker started");

const shutdown = async () => {
  logger.info("Shutting down workers...");
  await Promise.all([documentWorker.close(), matchingWorker.close()]);
  await closeRedisConnection();
  await closeMongoConnection();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
