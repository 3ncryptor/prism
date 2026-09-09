import { MongoClient, type Db } from "mongodb";
import { getMongoUri } from "@/lib/config/env";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(getMongoUri());
  return client.connect();
}

/**
 * Always cached at module scope: across Next.js dev hot-reloads (a fresh
 * module instance per reload would otherwise open a new connection every
 * save) and within any single process generally — a prior version of this
 * function only cached in `development`, which meant every `getDb()` call
 * elsewhere opened a brand-new, never-closed `MongoClient`. Use
 * `resetMongoConnectionForTests()` to force a fresh connection against a
 * different `MONGODB_URI` (e.g. between test files).
 */
function getClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}

/** Test-only escape hatch to force a fresh connection against a different MONGODB_URI. */
export function resetMongoConnectionForTests(): void {
  global._mongoClientPromise = undefined;
}

/** Closes the shared connection (tests, worker shutdown). */
export async function closeMongoConnection(): Promise<void> {
  if (global._mongoClientPromise) {
    const client = await global._mongoClientPromise;
    await client.close();
    global._mongoClientPromise = undefined;
  }
}
