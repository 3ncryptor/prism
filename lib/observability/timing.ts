import type { Logger } from "pino";

export interface TimingOptions {
  /** buildPlan.md §79's Pinecone/vector-store latency is a hot per-call
   * path (called per student per requirement during a match run) — use
   * "debug" there to avoid flooding logs; "info" (default) elsewhere. */
  level?: "info" | "debug";
  extra?: Record<string, unknown>;
}

/**
 * buildPlan.md §79: latency + failure tracking via structured logging,
 * no metrics backend. Wraps an async operation, logging its duration on
 * success and duration+error on failure (then rethrowing).
 */
export async function withTiming<T>(
  log: Logger,
  operation: string,
  fn: () => Promise<T>,
  options: TimingOptions = {},
): Promise<T> {
  const level = options.level ?? "info";
  const start = Date.now();
  try {
    const result = await fn();
    log[level]({ ...options.extra, operation, durationMs: Date.now() - start }, `${operation} completed`);
    return result;
  } catch (error) {
    log.error({ ...options.extra, operation, durationMs: Date.now() - start, err: error }, `${operation} failed`);
    throw error;
  }
}
