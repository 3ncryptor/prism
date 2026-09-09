import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { Job, JobStatus } from "@/lib/schemas/job";

export type JobDocument = Omit<Job, "_id"> & { _id: ObjectId };

function toJob(doc: JobDocument): Job {
  return { ...doc, _id: doc._id.toString() };
}

export class JobRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<JobDocument>>,
  ) {}

  async create(input: {
    title: string;
    company?: string;
    fileKey: string;
    createdBy: string;
  }): Promise<Job> {
    const collection = await this.getCollection();
    const now = new Date();
    const doc: JobDocument = {
      _id: new ObjectId(),
      ...input,
      status: "UPLOADED",
      archived: false,
      publishedMatchRunId: null,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    return toJob(doc);
  }

  async setFileKey(jobId: string, fileKey: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { fileKey, updatedAt: new Date() } },
    );
  }

  async updateStatus(
    jobId: string,
    status: JobStatus,
    error?: { code: string; message: string },
  ): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { status, error, updatedAt: new Date() } },
    );
  }

  async get(jobId: string): Promise<Job | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ _id: new ObjectId(jobId) });
    return doc ? toJob(doc) : null;
  }

  async list(filter: { archived?: boolean } = {}): Promise<Job[]> {
    const collection = await this.getCollection();
    const docs = await collection.find(filter).toArray();
    return docs.map(toJob);
  }

  async archive(jobId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { archived: true, updatedAt: new Date() } },
    );
  }

  /** buildPlan.md §113.2 — does not reset on rematch, admin must republish. */
  async setPublishedRun(jobId: string, matchRunId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { publishedMatchRunId: matchRunId, publishedAt: new Date(), updatedAt: new Date() } },
    );
  }

  async clearPublishedRun(jobId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { publishedMatchRunId: null, publishedAt: null, updatedAt: new Date() } },
    );
  }
}

async function defaultCollection(): Promise<Collection<JobDocument>> {
  const db = await getDb();
  return db.collection<JobDocument>("jobs");
}

export const jobRepository = new JobRepository(defaultCollection);
