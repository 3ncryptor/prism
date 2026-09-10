export interface TokenBucketState {
  tokens: number;
  lastRefillSeconds: number;
}

export interface TokenBucketConfig {
  /** Max requests allowed in a single burst. */
  capacity: number;
  /** Sustained throughput once the burst is spent. */
  refillRatePerSecond: number;
}

export interface TokenBucketResult {
  allowed: boolean;
  retryAfterSeconds: number;
  nextState: TokenBucketState;
}

/**
 * Pure token-bucket algorithm — no I/O, deterministic, directly unit
 * testable. The Redis-backed `checkTokenBucket` (tokenBucket.ts) runs the
 * same read-refill-consume-write logic atomically via a Lua script; this
 * function is the spec that Lua script mirrors, kept here so the algorithm
 * itself can be verified without a real Redis instance.
 *
 * Chosen over a fixed window for resume/JD uploads: legitimate usage is
 * bursty (a student tagging resumes for several job roles in one sitting,
 * an admin bulk-importing JDs at the start of a hiring season), and a hard
 * fixed-window wall would reject that burst outright. A token bucket lets
 * the burst through up to `capacity`, then throttles to `refillRatePerSecond`
 * — BullMQ's own worker concurrency then smooths the resulting queue
 * ingestion downstream, so this layer only needs to stop *sustained* abuse.
 */
export function computeTokenBucket(
  state: TokenBucketState | null,
  config: TokenBucketConfig,
  nowSeconds: number,
): TokenBucketResult {
  const current = state ?? { tokens: config.capacity, lastRefillSeconds: nowSeconds };
  const elapsed = Math.max(0, nowSeconds - current.lastRefillSeconds);
  const refilled = Math.min(config.capacity, current.tokens + elapsed * config.refillRatePerSecond);

  if (refilled >= 1) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
      nextState: { tokens: refilled - 1, lastRefillSeconds: nowSeconds },
    };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((1 - refilled) / config.refillRatePerSecond));
  return {
    allowed: false,
    retryAfterSeconds,
    nextState: { tokens: refilled, lastRefillSeconds: nowSeconds },
  };
}
