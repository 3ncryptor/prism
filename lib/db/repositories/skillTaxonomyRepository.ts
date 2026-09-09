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

  /** buildPlan.md §116: admin table shows both active and inactive skills. */
  async list(): Promise<SkillTaxonomyEntry[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({}).sort({ canonicalName: 1 }).toArray();
    return docs.map(toEntry);
  }

  async getById(id: string): Promise<SkillTaxonomyEntry | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntry(doc) : null;
  }

  async create(
    input: Omit<SkillTaxonomyEntry, "_id" | "isActive" | "createdAt" | "updatedAt">,
  ): Promise<SkillTaxonomyEntry> {
    const collection = await this.getCollection();
    const now = new Date();
    const doc: SkillTaxonomyDocument = {
      _id: new ObjectId(),
      ...input,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    return toEntry(doc);
  }

  /** buildPlan.md §116: edit name/category/aliases; isActive is toggled via deactivate() only. */
  async update(
    id: string,
    patch: Partial<Pick<SkillTaxonomyEntry, "displayName" | "category" | "aliases">>,
  ): Promise<SkillTaxonomyEntry | null> {
    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return result ? toEntry(result as SkillTaxonomyDocument) : null;
  }

  /** buildPlan.md §116: soft-delete only — never hard-delete a referenced canonical skill. */
  async deactivate(id: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: { isActive: false, updatedAt: new Date() } });
  }
}

async function defaultCollection(): Promise<Collection<SkillTaxonomyDocument>> {
  const db = await getDb();
  return db.collection<SkillTaxonomyDocument>("skillTaxonomy");
}

export const skillTaxonomyRepository = new SkillTaxonomyRepository(defaultCollection);
