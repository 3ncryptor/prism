import IORedis from "ioredis";
import { checkTokenBucket } from "@/lib/services/rateLimit/tokenBucket";
import { checkSlidingWindowLog } from "@/lib/services/rateLimit/slidingWindowLog";
import { RateLimitExceededError } from "@/lib/services/rateLimitService";
import { startRedisContainer } from "../redisContainer";

describe("rate limiting (real Redis via Docker)", () => {
  let stop: () => Promise<void>;
  let redis: IORedis;

  beforeAll(async () => {
    const container = await startRedisContainer();
    stop = container.stop;
    redis = new IORedis(container.url);
  }, 60_000);

  afterAll(async () => {
    await redis.quit();
    await stop();
  }, 30_000);

  describe("checkTokenBucket", () => {
    it("allows a burst up to capacity and rejects the next call", async () => {
      const rule = { key: "ratelimit:test:token-bucket:burst", capacity: 3, refillRatePerSecond: 1 / 60 };

      await checkTokenBucket(rule, redis);
      await checkTokenBucket(rule, redis);
      await checkTokenBucket(rule, redis);

      await expect(checkTokenBucket(rule, redis)).rejects.toThrow(RateLimitExceededError);
    });

    it("sets a TTL on the bucket key so an idle bucket doesn't linger forever", async () => {
      const rule = { key: "ratelimit:test:token-bucket:ttl", capacity: 5, refillRatePerSecond: 1 / 60 };
      await checkTokenBucket(rule, redis);

      const ttl = await redis.ttl(rule.key);
      expect(ttl).toBeGreaterThan(0);
    });

    it("tracks separate keys independently", async () => {
      const ruleA = { key: "ratelimit:test:token-bucket:independent-a", capacity: 1, refillRatePerSecond: 1 / 60 };
      const ruleB = { key: "ratelimit:test:token-bucket:independent-b", capacity: 1, refillRatePerSecond: 1 / 60 };

      await checkTokenBucket(ruleA, redis);
      await expect(checkTokenBucket(ruleA, redis)).rejects.toThrow(RateLimitExceededError);

      await expect(checkTokenBucket(ruleB, redis)).resolves.toBeUndefined();
    });

    it("reports a positive retryAfterSeconds on the thrown error", async () => {
      const rule = { key: "ratelimit:test:token-bucket:retry-after", capacity: 1, refillRatePerSecond: 1 / 30 };
      await checkTokenBucket(rule, redis);

      try {
        await checkTokenBucket(rule, redis);
        throw new Error("expected checkTokenBucket to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitExceededError);
        expect((error as RateLimitExceededError).retryAfterSeconds).toBeGreaterThan(0);
      }
    });
  });

  describe("checkSlidingWindowLog", () => {
    it("allows calls up to the limit and rejects the next one", async () => {
      const rule = { key: "ratelimit:test:sliding-window:allow-then-reject", limit: 3, windowSeconds: 60 };

      await checkSlidingWindowLog(rule, redis);
      await checkSlidingWindowLog(rule, redis);
      await checkSlidingWindowLog(rule, redis);

      await expect(checkSlidingWindowLog(rule, redis)).rejects.toThrow(RateLimitExceededError);
    });

    it("does not grow the sorted set past `limit` when repeatedly rejected", async () => {
      const rule = { key: "ratelimit:test:sliding-window:bounded", limit: 2, windowSeconds: 60 };
      await checkSlidingWindowLog(rule, redis);
      await checkSlidingWindowLog(rule, redis);

      for (let i = 0; i < 5; i++) {
        await expect(checkSlidingWindowLog(rule, redis)).rejects.toThrow(RateLimitExceededError);
      }

      const count = await redis.zcard(rule.key);
      expect(count).toBe(2);
    });

    it("tracks separate keys independently", async () => {
      const ruleA = { key: "ratelimit:test:sliding-window:independent-a", limit: 1, windowSeconds: 60 };
      const ruleB = { key: "ratelimit:test:sliding-window:independent-b", limit: 1, windowSeconds: 60 };

      await checkSlidingWindowLog(ruleA, redis);
      await expect(checkSlidingWindowLog(ruleA, redis)).rejects.toThrow(RateLimitExceededError);

      await expect(checkSlidingWindowLog(ruleB, redis)).resolves.toBeUndefined();
    });

    it("reports a positive retryAfterSeconds on the thrown error", async () => {
      const rule = { key: "ratelimit:test:sliding-window:retry-after", limit: 1, windowSeconds: 30 };
      await checkSlidingWindowLog(rule, redis);

      try {
        await checkSlidingWindowLog(rule, redis);
        throw new Error("expected checkSlidingWindowLog to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitExceededError);
        expect((error as RateLimitExceededError).retryAfterSeconds).toBeGreaterThan(0);
      }
    });
  });
});
