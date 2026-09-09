import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { ProcessingJob, ProcessingJobType } from "@/lib/schemas/processingJob";

export type ProcessingJobDocument = Omit<ProcessingJob, "_id"> & { _id: ObjectId };

function toProcessingJob(doc: ProcessingJobDocument): ProcessingJob {
  return { ...doc, _id: doc._id.toString() };
}

export class ProcessingJobRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<ProcessingJobDocument>>,
  ) {}

  async create(input: { type: ProcessingJobType; targetId: string }): Promise<ProcessingJob> {
    const collection = await this.getCollection();
    const now = new Date();
    const doc: ProcessingJobDocument = {
      _id: new ObjectId(),
      ...input,
      status: "QUEUED",
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    return toProcessingJob(doc);
  }

  async updateStatus(
    id: string,
    status: ProcessingJob["status"],
    error?: { code: string; message: string },
  ): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, error, updatedAt: new Date() } },
    );
  }

  async get(id: string): Promise<ProcessingJob | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    return doc ? toProcessingJob(doc) : null;
  }
}

async function defaultCollection(): Promise<Collection<ProcessingJobDocument>> {
  const db = await getDb();
  return db.collection<ProcessingJobDocument>("processingJobs");
}

export const processingJobRepository = new ProcessingJobRepository(defaultCollection);
