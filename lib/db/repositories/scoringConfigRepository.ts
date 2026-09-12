import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";

// `semanticThresholds.weak` (added 2026-09) is new — documents created
// before this feature shipped won't have it in Mongo. Defensively
// defaulted on read (same pattern as Job.listingStatus/leaderboardSize in
// jobRepository.ts), never backfilled in place: ScoringConfig is
// immutable once a matchRun could reference it (buildPlan.md §46), so an
// old config keeps scoring exactly as it always did — this default only
// keeps old documents from crashing zod validation, it doesn't change
// what they mean.
export type ScoringConfigDocument = Omit<ScoringConfig, "_id" | "semanticThresholds"> & {
  _id: ObjectId;
  semanticThresholds: Omit<ScoringConfig["semanticThresholds"], "weak"> & { weak?: number };
};

const DEFAULT_WEAK_THRESHOLD = 0.55;

function toScoringConfig(doc: ScoringConfigDocument): ScoringConfig {
  return {
    ...doc,
    _id: doc._id.toString(),
    semanticThresholds: { ...doc.semanticThresholds, weak: doc.semanticThresholds.weak ?? DEFAULT_WEAK_THRESHOLD },
  };
}

export class ScoringConfigRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<ScoringConfigDocument>>,
  ) {}

  async create(
    input: Omit<ScoringConfig, "_id" | "isActive" | "createdAt">,
  ): Promise<ScoringConfig> {
    const collection = await this.getCollection();
    const doc: ScoringConfigDocument = {
      _id: new ObjectId(),
      ...input,
      isActive: false,
      createdAt: new Date(),
    };
    await collection.insertOne(doc);
    return toScoringConfig(doc);
  }

  /**
   * buildPlan.md §113.3: exactly one active config at a time. Flips the
   * previous active version off and the given one on — never mutates an
   * already-referenced config's weights/thresholds in place (§46).
   */
  async activate(id: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateMany({ isActive: true }, { $set: { isActive: false } });
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: { isActive: true } });
  }

  async getActive(): Promise<ScoringConfig | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ isActive: true });
    return doc ? toScoringConfig(doc) : null;
  }

  async getByVersion(version: string): Promise<ScoringConfig | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ version });
    return doc ? toScoringConfig(doc) : null;
  }

  async listVersions(): Promise<ScoringConfig[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();
    return docs.map(toScoringConfig);
  }
}

async function defaultCollection(): Promise<Collection<ScoringConfigDocument>> {
  const db = await getDb();
  return db.collection<ScoringConfigDocument>("scoringConfigs");
}

export const scoringConfigRepository = new ScoringConfigRepository(defaultCollection);
