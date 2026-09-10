import { computeTokenBucket } from "@/lib/services/rateLimit/tokenBucketAlgorithm";

const CONFIG = { capacity: 8, refillRatePerSecond: 1 / 300 }; // 8 burst, 1 token/5min

describe("computeTokenBucket", () => {
  it("starts full: allows a burst up to capacity with no prior state", () => {
    let state = null;
    for (let i = 0; i < CONFIG.capacity; i++) {
      const result = computeTokenBucket(state, CONFIG, 1_000);
      expect(result.allowed).toBe(true);
      state = result.nextState;
    }
  });

  it("rejects the request immediately after the burst is spent", () => {
    let state = null;
    for (let i = 0; i < CONFIG.capacity; i++) {
      state = computeTokenBucket(state, CONFIG, 1_000).nextState;
    }
    const result = computeTokenBucket(state, CONFIG, 1_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("refills over time and eventually allows another request", () => {
    let state = null;
    for (let i = 0; i < CONFIG.capacity; i++) {
      state = computeTokenBucket(state, CONFIG, 1_000).nextState;
    }
    // Exactly one refill interval later (300s @ 1/300 per second = 1 token).
    const result = computeTokenBucket(state, CONFIG, 1_000 + 300);
    expect(result.allowed).toBe(true);
  });

  it("never accumulates more than capacity tokens even after a long idle period", () => {
    const state = { tokens: 2, lastRefillSeconds: 0 };
    const result = computeTokenBucket(state, CONFIG, 1_000_000);
    // Fully refilled to capacity, one consumed by this request.
    expect(result.nextState.tokens).toBe(CONFIG.capacity - 1);
  });

  it("reports a sensible retryAfterSeconds proportional to the refill rate", () => {
    let state = null;
    for (let i = 0; i < CONFIG.capacity; i++) {
      state = computeTokenBucket(state, CONFIG, 0).nextState;
    }
    const result = computeTokenBucket(state, CONFIG, 0);
    // One token needs a full refill interval (300s) from empty.
    expect(result.retryAfterSeconds).toBe(300);
  });
});
