import IORedis from "ioredis";
import { checkRateLimit, RateLimitExceededError } from "@/lib/services/rateLimitService";
import { startRedisContainer } from "../redisContainer";

describe("checkRateLimit (real Redis via Docker)", () => {
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

  it("allows calls up to the limit and rejects the next one", async () => {
    const rule = { key: "ratelimit:test:allow-then-reject", limit: 3, windowSeconds: 60 };

    await checkRateLimit(rule, redis);
    await checkRateLimit(rule, redis);
    await checkRateLimit(rule, redis);

    await expect(checkRateLimit(rule, redis)).rejects.toThrow(RateLimitExceededError);
  });

  it("sets a TTL on the key so the window actually expires", async () => {
    const rule = { key: "ratelimit:test:ttl-set", limit: 5, windowSeconds: 60 };
    await checkRateLimit(rule, redis);

    const ttl = await redis.ttl(rule.key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it("tracks separate keys independently", async () => {
    const ruleA = { key: "ratelimit:test:independent-a", limit: 1, windowSeconds: 60 };
    const ruleB = { key: "ratelimit:test:independent-b", limit: 1, windowSeconds: 60 };

    await checkRateLimit(ruleA, redis);
    await expect(checkRateLimit(ruleA, redis)).rejects.toThrow(RateLimitExceededError);

    await expect(checkRateLimit(ruleB, redis)).resolves.toBeUndefined();
  });

  it("reports a positive retryAfterSeconds on the thrown error", async () => {
    const rule = { key: "ratelimit:test:retry-after", limit: 1, windowSeconds: 30 };
    await checkRateLimit(rule, redis);

    try {
      await checkRateLimit(rule, redis);
      throw new Error("expected checkRateLimit to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitExceededError);
      expect((error as RateLimitExceededError).retryAfterSeconds).toBeGreaterThan(0);
    }
  });
});
