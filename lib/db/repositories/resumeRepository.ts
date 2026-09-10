import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { Resume, ResumeStatus } from "@/lib/schemas/resume";

// `label` (feature 27d) is new and required — documents created before this
// feature shipped won't have it in Mongo. Defaulted defensively on read
// (same pattern as Job.listingStatus/leaderboardSize in jobRepository.ts)
// rather than a migration script for a handful of dev-era docs.
export interface ResumeDocument {
  _id: ObjectId;
  studentId: string;
  label?: string;
  fileKey: string;
  originalName: string;
  isActive: boolean;
  status: ResumeStatus;
  error?: { code: string; message: string };
  createdAt: Date;
  updatedAt: Date;
}

function toResume(doc: ResumeDocument): Resume {
  return { ...doc, _id: doc._id.toString(), label: doc.label ?? "Resume" };
}

export class ResumeRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<ResumeDocument>>,
  ) {}

  /** docs/screens.md §4.6 (feature 27d): enforces at most one published resume per student. */
  async deactivateAllForStudent(studentId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateMany(
      { studentId, isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } },
    );
  }

  /** docs/screens.md §4.6 (feature 27d): every upload adds a new resume — never replaces one, never auto-publishes. */
  async create(input: {
    studentId: string;
    label: string;
    fileKey: string;
    originalName: string;
  }): Promise<Resume> {
    const collection = await this.getCollection();
    const now = new Date();
    const doc: ResumeDocument = {
      _id: new ObjectId(),
      ...input,
      isActive: false,
      status: "UPLOADED",
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    return toResume(doc);
  }

  /** docs/screens.md §4.6 (feature 27d): publishing one resume un-publishes any other for the same student. */
  async setActive(resumeId: string, studentId: string): Promise<void> {
    await this.deactivateAllForStudent(studentId);
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(resumeId) },
      { $set: { isActive: true, updatedAt: new Date() } },
    );
  }

  async setIsActive(resumeId: string, isActive: boolean): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(resumeId) },
      { $set: { isActive, updatedAt: new Date() } },
    );
  }

  async setFileKey(resumeId: string, fileKey: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(resumeId) },
      { $set: { fileKey, updatedAt: new Date() } },
    );
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
