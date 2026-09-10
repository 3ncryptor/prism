import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { getRedisConnection } from "@/lib/queue/connection";
import { logger } from "@/lib/logger";

/**
 * Liveness/readiness probe for load balancers and container orchestrators.
 * Deliberately unauthenticated (a health check that requires a session
 * isn't checkable by infrastructure) and reveals only up/down status, no
 * connection strings or internal detail.
 */
export async function GET() {
  const [mongoResult, redisResult] = await Promise.allSettled([
    getDb().then((db) => db.command({ ping: 1 })),
    getRedisConnection().ping(),
  ]);

  const mongoOk = mongoResult.status === "fulfilled";
  const redisOk = redisResult.status === "fulfilled";

  if (!mongoOk) logger.error({ err: mongoResult.reason }, "Health check: MongoDB ping failed");
  if (!redisOk) logger.error({ err: redisResult.reason }, "Health check: Redis ping failed");

  const healthy = mongoOk && redisOk;
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", mongo: mongoOk ? "ok" : "down", redis: redisOk ? "ok" : "down" },
    { status: healthy ? 200 : 503 },
  );
}
