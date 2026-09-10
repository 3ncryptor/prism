import type IORedis from "ioredis";
import { getRedisConnection } from "@/lib/queue/connection";
import { RateLimitExceededError } from "@/lib/services/rateLimit/errors";

export interface SlidingWindowRule {
  key: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Atomic Redis implementation of the sliding-window-log algorithm specified
 * (and unit-tested) in slidingWindowAlgorithm.ts's `computeSlidingWindow`,
 * via a Redis sorted set: ZREMRANGEBYSCORE evicts entries older than the
 * window, ZCARD counts survivors, ZADD records an admitted request — all in
 * one Lua script so the check-then-record step can't race across requests.
 * A companion `<key>:seq` counter guarantees unique sorted-set members even
 * when two requests land in the same millisecond.
 */
const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local seqKey = KEYS[2]
local nowMs = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local ttlSeconds = tonumber(ARGV[4])

redis.call("ZREMRANGEBYSCORE", key, 0, nowMs - windowMs)

local count = redis.call("ZCARD", key)
local allowed = 0
if count < limit then
  local seq = redis.call("INCR", seqKey)
  redis.call("ZADD", key, nowMs, nowMs .. "-" .. seq)
  redis.call("EXPIRE", key, ttlSeconds)
  redis.call("EXPIRE", seqKey, ttlSeconds)
  allowed = 1
end

local retryAfter = 0
if allowed == 0 then
  local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
  if oldest[2] then
    retryAfter = math.ceil((tonumber(oldest[2]) + windowMs - nowMs) / 1000)
  else
    retryAfter = math.ceil(windowMs / 1000)
  end
  if retryAfter < 1 then retryAfter = 1 end
end

return {allowed, retryAfter}
`;

export async function checkSlidingWindowLog(
  rule: SlidingWindowRule,
  redis: Pick<IORedis, "eval"> = getRedisConnection(),
): Promise<void> {
  const nowMs = Date.now();
  const windowMs = rule.windowSeconds * 1000;

  const result = (await redis.eval(
    SLIDING_WINDOW_SCRIPT,
    2,
    rule.key,
    `${rule.key}:seq`,
    nowMs,
    windowMs,
    rule.limit,
    rule.windowSeconds,
  )) as [number, number];

  const [allowed, retryAfterSeconds] = result;
  if (allowed === 0) {
    throw new RateLimitExceededError(retryAfterSeconds);
  }
}
