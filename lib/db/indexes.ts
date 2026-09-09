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

  await db.collection("matchRuns").createIndex({ jobId: 1 });
  await db.collection("matchResults").createIndex({ matchRunId: 1, studentId: 1 }, { unique: true });
  await db.collection("matchResults").createIndex({ jobId: 1, bucket: 1 });

  await db.collection("scoringConfigs").createIndex({ version: 1 }, { unique: true });
  // isActive is an application-level invariant (exactly one true), enforced
  // by ScoringConfigRepository.activate()'s two sequential updates, not a
  // unique index — Mongo can't express "at most one true" as one.
  await db.collection("scoringConfigs").createIndex({ isActive: 1 });
}
