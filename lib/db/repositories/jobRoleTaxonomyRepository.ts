import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { JobRoleTaxonomyEntry } from "@/lib/schemas/jobRoleTaxonomy";

export type JobRoleTaxonomyDocument = Omit<JobRoleTaxonomyEntry, "_id"> & { _id: ObjectId };

function toEntry(doc: JobRoleTaxonomyDocument): JobRoleTaxonomyEntry {
  return { ...doc, _id: doc._id.toString() };
}

/** docs/screens.md §4.11 (feature 27e). Structurally copied from skillTaxonomyRepository.ts. */
export class JobRoleTaxonomyRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<JobRoleTaxonomyDocument>>,
  ) {}

  async listActive(): Promise<JobRoleTaxonomyEntry[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({ isActive: true }).toArray();
    return docs.map(toEntry);
  }

  async list(): Promise<JobRoleTaxonomyEntry[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({}).sort({ canonicalName: 1 }).toArray();
    return docs.map(toEntry);
  }

  async getById(id: string): Promise<JobRoleTaxonomyEntry | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntry(doc) : null;
  }

  async create(
    input: Omit<JobRoleTaxonomyEntry, "_id" | "isActive" | "createdAt" | "updatedAt">,
  ): Promise<JobRoleTaxonomyEntry> {
    const collection = await this.getCollection();
    const now = new Date();
    const doc: JobRoleTaxonomyDocument = {
      _id: new ObjectId(),
      ...input,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    return toEntry(doc);
  }

  async update(
    id: string,
    patch: Partial<Pick<JobRoleTaxonomyEntry, "displayName">>,
  ): Promise<JobRoleTaxonomyEntry | null> {
    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return result ? toEntry(result as JobRoleTaxonomyDocument) : null;
  }

  /** Soft-delete only — never hard-delete a role that may be referenced by jobs/resumes. */
  async deactivate(id: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: { isActive: false, updatedAt: new Date() } });
  }
}

async function defaultCollection(): Promise<Collection<JobRoleTaxonomyDocument>> {
  const db = await getDb();
  return db.collection<JobRoleTaxonomyDocument>("jobRoleTaxonomy");
}

export const jobRoleTaxonomyRepository = new JobRoleTaxonomyRepository(defaultCollection);
