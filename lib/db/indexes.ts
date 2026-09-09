import type { Db } from "mongodb";

/** Index creation per docs/BACKEND_ARCHITECTURE.md §3.2. Idempotent — safe to call repeatedly. */
export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });

  await db.collection("resumes").createIndex({ studentId: 1, isActive: 1 });

  await db.collection("studentProfiles").createIndex({ studentId: 1, isActive: 1 });

  await db.collection("jobs").createIndex({ status: 1 });
  await db.collection("jobs").createIndex({ publishedMatchRunId: 1 });

  await db.collection("jobProfiles").createIndex({ jobId: 1 }, { unique: true });

  await db.collection("skillTaxonomy").createIndex({ canonicalName: 1 }, { unique: true });
  await db.collection("skillTaxonomy").createIndex({ isActive: 1 });
}
