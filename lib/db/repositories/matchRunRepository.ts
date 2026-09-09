import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { MatchRun, MatchRunStatus } from "@/lib/schemas/matchRun";

export type MatchRunDocument = Omit<MatchRun, "_id"> & { _id: ObjectId };

function toMatchRun(doc: MatchRunDocument): MatchRun {
  return { ...doc, _id: doc._id.toString() };
}

export class MatchRunRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<MatchRunDocument>>,
  ) {}

  async create(input: {
    jobId: string;
    scoringConfigVersion: string;
    extractionModelVersion: string;
    embeddingModelVersion: string;
  }): Promise<MatchRun> {
    const collection = await this.getCollection();
    const doc: MatchRunDocument = {
      _id: new ObjectId(),
      ...input,
      status: "QUEUED",
      candidateCount: 0,
      processedCount: 0,
      createdAt: new Date(),
    };
    await collection.insertOne(doc);
    return toMatchRun(doc);
  }

  async updateStatus(
    runId: string,
    status: MatchRunStatus,
    error?: { code: string; message: string },
  ): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne({ _id: new ObjectId(runId) }, { $set: { status, error } });
  }

  async setCandidateCount(runId: string, candidateCount: number): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne({ _id: new ObjectId(runId) }, { $set: { candidateCount } });
  }

  async incrementProcessed(runId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne({ _id: new ObjectId(runId) }, { $inc: { processedCount: 1 } });
  }

  async complete(runId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(runId) },
      { $set: { status: "COMPLETED", completedAt: new Date() } },
    );
  }

  async get(runId: string): Promise<MatchRun | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ _id: new ObjectId(runId) });
    return doc ? toMatchRun(doc) : null;
  }

  async listByJob(jobId: string): Promise<MatchRun[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({ jobId }).sort({ createdAt: -1 }).toArray();
    return docs.map(toMatchRun);
  }
}

async function defaultCollection(): Promise<Collection<MatchRunDocument>> {
  const db = await getDb();
  return db.collection<MatchRunDocument>("matchRuns");
}

export const matchRunRepository = new MatchRunRepository(defaultCollection);
