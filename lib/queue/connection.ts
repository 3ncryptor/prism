import IORedis from "ioredis";
import { getRedisUrl } from "@/lib/config/env";

let cachedConnection: IORedis | null = null;

/** BullMQ requires this option on the connection it's given. */
export function getRedisConnection(): IORedis {
  if (cachedConnection) return cachedConnection;
  cachedConnection = new IORedis(getRedisUrl(), { maxRetriesPerRequest: null });
  return cachedConnection;
}

/** Test-only escape hatch to force a fresh connection against a different URL. */
export function resetRedisConnectionForTests(): void {
  cachedConnection = null;
}

/** Closes the shared connection — BullMQ's Queue.close() does not close a
 * connection it didn't create itself, so callers (tests, worker shutdown)
 * must do this explicitly or the process never exits. */
export async function closeRedisConnection(): Promise<void> {
  if (cachedConnection) {
    await cachedConnection.quit();
    cachedConnection = null;
  }
}
