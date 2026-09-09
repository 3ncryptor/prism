import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { Resume, ResumeStatus } from "@/lib/schemas/resume";

export interface ResumeDocument {
  _id: ObjectId;
  studentId: string;
  fileKey: string;
  originalName: string;
  isActive: boolean;
  status: ResumeStatus;
  error?: { code: string; message: string };
  createdAt: Date;
  updatedAt: Date;
}

function toResume(doc: ResumeDocument): Resume {
  return { ...doc, _id: doc._id.toString() };
}

export class ResumeRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<ResumeDocument>>,
  ) {}

  async create(input: {
    studentId: string;
    fileKey: string;
    originalName: string;
  }): Promise<Resume> {
    const collection = await this.getCollection();
    const now = new Date();
    const doc: ResumeDocument = {
      _id: new ObjectId(),
      ...input,
      isActive: true,
      status: "UPLOADED",
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    return toResume(doc);
  }

  async updateStatus(
    resumeId: string,
    status: ResumeStatus,
    error?: { code: string; message: string },
  ): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(resumeId) },
      { $set: { status, error, updatedAt: new Date() } },
    );
  }

  async get(resumeId: string): Promise<Resume | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ _id: new ObjectId(resumeId) });
    return doc ? toResume(doc) : null;
  }

  async getActiveByStudent(studentId: string): Promise<Resume | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ studentId, isActive: true });
    return doc ? toResume(doc) : null;
  }

  async listByStudent(studentId: string): Promise<Resume[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({ studentId }).sort({ createdAt: -1 }).toArray();
    return docs.map(toResume);
  }
}

async function defaultCollection(): Promise<Collection<ResumeDocument>> {
  const db = await getDb();
  return db.collection<ResumeDocument>("resumes");
}

export const resumeRepository = new ResumeRepository(defaultCollection);
