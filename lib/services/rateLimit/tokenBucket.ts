import type IORedis from "ioredis";
import { getRedisConnection } from "@/lib/queue/connection";
import { RateLimitExceededError } from "@/lib/services/rateLimit/errors";

export interface TokenBucketRule {
  key: string;
  capacity: number;
  refillRatePerSecond: number;
}

/**
 * Atomic Redis implementation of the token-bucket algorithm specified (and
 * unit-tested) in tokenBucketAlgorithm.ts's `computeTokenBucket` — the
 * read-refill-consume-write cycle runs server-side in a single Lua script
 * so it can't race the way the old fixed-window INCR-then-EXPIRE could (two
 * separate round trips that could leave a key stuck with no TTL forever if
 * the process died in between).
 */
const TOKEN_BUCKET_SCRIPT = `
local tokens = tonumber(redis.call("HGET", KEYS[1], "tokens"))
local ts = tonumber(redis.call("HGET", KEYS[1], "ts"))
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

if tokens == nil then
  tokens = capacity
  ts = now
end

local elapsed = math.max(0, now - ts)
tokens = math.min(capacity, tokens + (elapsed * refillRate))

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

redis.call("HSET", KEYS[1], "tokens", tostring(tokens), "ts", tostring(now))
redis.call("EXPIRE", KEYS[1], ttl)

local retryAfter = 0
if allowed == 0 then
  retryAfter = math.ceil((1 - tokens) / refillRate)
  if retryAfter < 1 then retryAfter = 1 end
end

return {allowed, retryAfter}
`;

export async function checkTokenBucket(
  rule: TokenBucketRule,
  redis: Pick<IORedis, "eval"> = getRedisConnection(),
): Promise<void> {
  const now = Date.now() / 1000;
  // Idle buckets expire well after a full refill cycle so Redis doesn't
  // hold dead keys forever, without risking eviction mid-burst.
  const ttlSeconds = Math.ceil((rule.capacity / rule.refillRatePerSecond) * 2);

  const result = (await redis.eval(
    TOKEN_BUCKET_SCRIPT,
    1,
    rule.key,
    rule.capacity,
    rule.refillRatePerSecond,
    now,
    ttlSeconds,
  )) as [number, number];

  const [allowed, retryAfterSeconds] = result;
  if (allowed === 0) {
    throw new RateLimitExceededError(retryAfterSeconds);
  }
}
