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

/**
 * This is a long-running process, not a request-scoped Next.js handler —
 * an error here has no framework-level catch to fall back on. Without
 * these, a bug that escapes a job handler's own try/catch (e.g. in
 * document-worker.ts/matching-worker.ts) would either crash the process
 * with no log of why, or — for an unhandled rejection specifically —
 * leave Node running in a possibly-corrupted state indefinitely. Logging
 * and exiting lets whatever process manager/orchestrator restarts this
 * container do so cleanly, rather than silently degrading in place.
 */
process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "Uncaught exception in worker process — exiting");
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection in worker process — exiting");
  process.exit(1);
});
