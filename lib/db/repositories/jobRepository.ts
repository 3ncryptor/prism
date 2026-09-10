import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { Job, JobListingStatus, JobStatus } from "@/lib/schemas/job";

const DEFAULT_LEADERBOARD_SIZE = 10;

// listingStatus/leaderboardSize (27c) and jobRole (27e) are new fields —
// documents created before these features shipped won't have them in
// Mongo. Rather than a one-off migration script for a handful of dev-era
// docs, default them defensively on read; new docs get them set at create
// time.
export type JobDocument = Omit<Job, "_id" | "listingStatus" | "leaderboardSize" | "jobRole"> & {
  _id: ObjectId;
  listingStatus?: JobListingStatus;
  leaderboardSize?: number;
  jobRole?: string | null;
};

function toJob(doc: JobDocument): Job {
  return {
    ...doc,
    _id: doc._id.toString(),
    listingStatus: doc.listingStatus ?? "DRAFT",
    leaderboardSize: doc.leaderboardSize ?? DEFAULT_LEADERBOARD_SIZE,
    jobRole: doc.jobRole ?? null,
  };
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
    jobRole: string | null;
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
      listingStatus: "DRAFT",
      leaderboardSize: DEFAULT_LEADERBOARD_SIZE,
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

  /** docs/screens.md §4.10 (feature 27c): Draft <-> Live toggle. */
  async setListingStatus(jobId: string, listingStatus: JobListingStatus): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { listingStatus, updatedAt: new Date() } },
    );
  }

  /** docs/screens.md §4.10 (feature 27c): admin-configurable leaderboard top-N. */
  async setLeaderboardSize(jobId: string, leaderboardSize: number): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { leaderboardSize, updatedAt: new Date() } },
    );
  }

  /** docs/screens.md §4.11 (feature 27e): usage count for the job role taxonomy admin table. */
  async countReferencingRole(canonicalName: string): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments({ jobRole: canonicalName });
  }
}

async function defaultCollection(): Promise<Collection<JobDocument>> {
  const db = await getDb();
  return db.collection<JobDocument>("jobs");
}

export const jobRepository = new JobRepository(defaultCollection);
