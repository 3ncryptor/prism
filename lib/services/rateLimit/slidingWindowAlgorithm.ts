export interface SlidingWindowConfig {
  limit: number;
  windowSeconds: number;
}

export interface SlidingWindowResult {
  allowed: boolean;
  retryAfterSeconds: number;
  /** Surviving timestamps after this call — persist these for the next call. */
  nextTimestamps: number[];
}

/**
 * Pure sliding-window-log algorithm — no I/O, deterministic, directly unit
 * testable. The Redis-backed `checkSlidingWindowLog` (slidingWindowLog.ts)
 * mirrors this exact logic atomically via a Lua script (ZREMRANGEBYSCORE to
 * evict, ZCARD to count, ZADD to record), so this function is the spec that
 * script implements.
 *
 * Chosen over a fixed window for forgot-password: a fixed window can let
 * through up to 2x its stated limit right at the window boundary (e.g. 3
 * requests just before the window rolls over, then 3 more just after) —
 * for a security-sensitive, low-volume endpoint like this, that imprecision
 * matters more than the cost of tracking individual timestamps. Rejected
 * attempts are NOT counted (only admitted ones are), so the log is always
 * bounded by `limit` entries and an attacker hammering a locked-out key
 * can't grow it further.
 */
export function computeSlidingWindow(
  timestampsSeconds: number[],
  config: SlidingWindowConfig,
  nowSeconds: number,
): SlidingWindowResult {
  const cutoff = nowSeconds - config.windowSeconds;
  const surviving = timestampsSeconds.filter((t) => t > cutoff).sort((a, b) => a - b);

  if (surviving.length < config.limit) {
    return { allowed: true, retryAfterSeconds: 0, nextTimestamps: [...surviving, nowSeconds] };
  }

  const oldest = surviving[0];
  const retryAfterSeconds = Math.max(1, Math.ceil(oldest + config.windowSeconds - nowSeconds));
  return { allowed: false, retryAfterSeconds, nextTimestamps: surviving };
}
