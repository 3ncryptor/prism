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
 * Cached across Next.js dev hot-reloads (a fresh module instance per reload
 * would otherwise open a new connection every save). In production/test,
 * each process gets its own single connection.
 */
function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClientPromise();
    }
    return global._mongoClientPromise;
  }
  return createClientPromise();
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}
