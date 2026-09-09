import type IORedis from "ioredis";
import { getRedisConnection } from "@/lib/queue/connection";

export class RateLimitExceededError extends Error {
  constructor(
    public readonly retryAfterSeconds: number,
  ) {
    super(`Rate limit exceeded. Try again in ${retryAfterSeconds}s.`);
    this.name = "RateLimitExceededError";
  }
}

export interface RateLimitRule {
  key: string;
  limit: number;
  windowSeconds: number;
}

type RedisCounter = Pick<IORedis, "incr" | "expire" | "ttl">;

/**
 * buildPlan.md §83: fixed-window counter via Redis INCR+EXPIRE, reusing
 * the same connection BullMQ already holds open — no new infra. Not
 * perfectly precise at window boundaries (a caller could burst up to
 * ~2x limit across one), which is an accepted tradeoff for the simplicity
 * of a single atomic INCR versus a sliding-window log for this use case.
 */
export async function checkRateLimit(rule: RateLimitRule, redis: RedisCounter = getRedisConnection()): Promise<void> {
  const count = await redis.incr(rule.key);
  if (count === 1) {
    await redis.expire(rule.key, rule.windowSeconds);
  }
  if (count > rule.limit) {
    const ttl = await redis.ttl(rule.key);
    throw new RateLimitExceededError(ttl > 0 ? ttl : rule.windowSeconds);
  }
}

/** buildPlan.md §83's explicit protected-action list. */
export const RATE_LIMITS = {
  resumeUpload: (studentId: string): RateLimitRule => ({
    key: `ratelimit:resume-upload:${studentId}`,
    limit: 5,
    windowSeconds: 600,
  }),
  jdUpload: (adminId: string): RateLimitRule => ({
    key: `ratelimit:jd-upload:${adminId}`,
    limit: 20,
    windowSeconds: 3600,
  }),
  matchRun: (adminId: string): RateLimitRule => ({
    key: `ratelimit:match-run:${adminId}`,
    limit: 10,
    windowSeconds: 60,
  }),
};
