import { computeSlidingWindow } from "@/lib/services/rateLimit/slidingWindowAlgorithm";

const CONFIG = { limit: 3, windowSeconds: 600 };

describe("computeSlidingWindow", () => {
  it("allows up to `limit` requests with no prior history", () => {
    let timestamps: number[] = [];
    for (let i = 0; i < CONFIG.limit; i++) {
      const result = computeSlidingWindow(timestamps, CONFIG, 1_000 + i);
      expect(result.allowed).toBe(true);
      timestamps = result.nextTimestamps;
    }
  });

  it("rejects the (limit + 1)th request within the window", () => {
    let timestamps: number[] = [];
    for (let i = 0; i < CONFIG.limit; i++) {
      timestamps = computeSlidingWindow(timestamps, CONFIG, 1_000 + i).nextTimestamps;
    }
    const result = computeSlidingWindow(timestamps, CONFIG, 1_000 + CONFIG.limit);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("does not grow the log when requests are rejected (bounded by `limit`)", () => {
    let timestamps: number[] = [];
    for (let i = 0; i < CONFIG.limit; i++) {
      timestamps = computeSlidingWindow(timestamps, CONFIG, 1_000).nextTimestamps;
    }
    for (let i = 0; i < 50; i++) {
      const result = computeSlidingWindow(timestamps, CONFIG, 1_000);
      expect(result.allowed).toBe(false);
      timestamps = result.nextTimestamps;
    }
    expect(timestamps.length).toBe(CONFIG.limit);
  });

  it("does not double-admit at the window boundary — precise, unlike a fixed window", () => {
    // 3 requests right before the window closes...
    let timestamps: number[] = [];
    for (let i = 0; i < CONFIG.limit; i++) {
      timestamps = computeSlidingWindow(timestamps, CONFIG, 1_000).nextTimestamps;
    }
    // ...a fixed window keyed on a 600s bucket would reset here and allow 3
    // more; the sliding log must not, since the original 3 are still <600s old.
    const result = computeSlidingWindow(timestamps, CONFIG, 1_000 + 599);
    expect(result.allowed).toBe(false);
  });

  it("admits again once the oldest entry ages out of the window", () => {
    let timestamps: number[] = [];
    for (let i = 0; i < CONFIG.limit; i++) {
      timestamps = computeSlidingWindow(timestamps, CONFIG, 1_000).nextTimestamps;
    }
    const result = computeSlidingWindow(timestamps, CONFIG, 1_000 + CONFIG.windowSeconds + 1);
    expect(result.allowed).toBe(true);
  });
});
