import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { MatchResult } from "@/lib/schemas/matchResult";
import type { FitBucket } from "@/lib/matching/types";

export type MatchResultDocument = Omit<MatchResult, "_id"> & { _id: ObjectId };

function toMatchResult(doc: MatchResultDocument): MatchResult {
  return { ...doc, _id: doc._id.toString() };
}

export class MatchResultRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<MatchResultDocument>>,
  ) {}

  /**
   * buildPlan.md §56: keyed on (matchRunId, studentId) — a retried worker
   * job after partial failure overwrites, never duplicates.
   */
  async upsert(result: Omit<MatchResult, "_id">): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { matchRunId: result.matchRunId, studentId: result.studentId },
      { $set: result, $setOnInsert: { _id: new ObjectId() } },
      { upsert: true },
    );
  }

  /**
   * `includeIneligible` per BACKEND_ARCHITECTURE.md §0.3 — ineligible
   * students are excluded from the default view but visible behind this
   * explicit flag, never silently dropped from the data.
   */
  async listByRun(
    runId: string,
    filter: { bucket?: FitBucket; minScore?: number; includeIneligible?: boolean } = {},
  ): Promise<MatchResult[]> {
    const collection = await this.getCollection();
    const query: Record<string, unknown> = { matchRunId: runId };
    if (filter.bucket) query.bucket = filter.bucket;
    if (filter.minScore !== undefined) query.score = { $gte: filter.minScore };
    if (!filter.includeIneligible) query.eligible = true;

    const docs = await collection.find(query).sort({ score: -1 }).toArray();
    return docs.map(toMatchResult);
  }

  async getByRunAndStudent(runId: string, studentId: string): Promise<MatchResult | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ matchRunId: runId, studentId });
    return doc ? toMatchResult(doc) : null;
  }

  /** buildPlan.md §113.2/§0.6: every result this student has, across all jobs/runs. */
  async listByStudent(studentId: string): Promise<MatchResult[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({ studentId }).sort({ createdAt: -1 }).toArray();
    return docs.map(toMatchResult);
  }
}

async function defaultCollection(): Promise<Collection<MatchResultDocument>> {
  const db = await getDb();
  return db.collection<MatchResultDocument>("matchResults");
}

export const matchResultRepository = new MatchResultRepository(defaultCollection);
