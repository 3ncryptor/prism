import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { SkillTaxonomyEntry } from "@/lib/schemas/skillTaxonomy";

export type SkillTaxonomyDocument = Omit<SkillTaxonomyEntry, "_id"> & { _id: ObjectId };

function toEntry(doc: SkillTaxonomyDocument): SkillTaxonomyEntry {
  return { ...doc, _id: doc._id.toString() };
}

export class SkillTaxonomyRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<SkillTaxonomyDocument>>,
  ) {}

  /**
   * Idempotent by `canonicalName` (buildPlan.md §56) so the seed script can
   * be re-run without duplicating entries.
   */
  async upsertByCanonicalName(input: {
    canonicalName: string;
    displayName: string;
    category: SkillTaxonomyEntry["category"];
    aliases: string[];
    createdBy: string;
  }): Promise<SkillTaxonomyEntry> {
    const collection = await this.getCollection();
    const now = new Date();
    const result = await collection.findOneAndUpdate(
      { canonicalName: input.canonicalName },
      {
        $set: {
          displayName: input.displayName,
          category: input.category,
          aliases: input.aliases,
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId(),
          canonicalName: input.canonicalName,
          createdBy: input.createdBy,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    return toEntry(result as SkillTaxonomyDocument);
  }

  async listActive(): Promise<SkillTaxonomyEntry[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({ isActive: true }).toArray();
    return docs.map(toEntry);
  }
}

async function defaultCollection(): Promise<Collection<SkillTaxonomyDocument>> {
  const db = await getDb();
  return db.collection<SkillTaxonomyDocument>("skillTaxonomy");
}

export const skillTaxonomyRepository = new SkillTaxonomyRepository(defaultCollection);
