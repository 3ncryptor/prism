import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { Resume, ResumeStatus } from "@/lib/schemas/resume";

// `label` (27d) and `jobRole` (27e) are new — documents created before
// these features shipped won't have them in Mongo. Defaulted defensively
// on read (same pattern as Job.listingStatus/leaderboardSize in
// jobRepository.ts) rather than a migration script for a handful of
// dev-era docs.
export interface ResumeDocument {
  _id: ObjectId;
  studentId: string;
  label?: string;
  jobRole?: string | null;
  fileKey: string;
  originalName: string;
  isActive: boolean;
  status: ResumeStatus;
  error?: { code: string; message: string };
  createdAt: Date;
  updatedAt: Date;
}

function toResume(doc: ResumeDocument): Resume {
  return { ...doc, _id: doc._id.toString(), label: doc.label ?? "Resume", jobRole: doc.jobRole ?? null };
}

export class ResumeRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<ResumeDocument>>,
  ) {}

  /** docs/screens.md §4.6 (feature 27d): every upload adds a new resume — never replaces one, never auto-publishes. */
  async create(input: {
    studentId: string;
    label: string;
    jobRole: string | null;
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

  async setIsActive(resumeId: string, isActive: boolean): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(resumeId) },
      { $set: { isActive, updatedAt: new Date() } },
    );
  }

  /**
   * docs/screens.md §3 decision #2 (feature 27e): "Selection, not
   * multiplication" — a student may have at most one *published* resume
   * per role (including the null/global role) at a time. Used both to
   * reject a conflicting manual publish and to decide whether a freshly
   * processed resume can safely auto-publish.
   */
  async hasActiveForRole(studentId: string, jobRole: string | null, excludeResumeId?: string): Promise<boolean> {
    const collection = await this.getCollection();
    const count = await collection.countDocuments({
      studentId,
      jobRole,
      isActive: true,
      ...(excludeResumeId ? { _id: { $ne: new ObjectId(excludeResumeId) } } : {}),
    });
    return count > 0;
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

  /** Display-only (e.g. the Dashboard summary card) — with multi-role publishing, a student can have more than one active resume; this returns just one of them. */
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

  /** docs/screens.md §4.11 (feature 27e): usage count for the job role taxonomy admin table. */
  async countReferencingRole(canonicalName: string): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments({ jobRole: canonicalName });
  }

  /** docs/screens.md §8.7 (feature 27n): "candidate pool health" — published resumes per role. */
  async countActiveByRole(canonicalName: string): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments({ jobRole: canonicalName, isActive: true });
  }
}

async function defaultCollection(): Promise<Collection<ResumeDocument>> {
  const db = await getDb();
  return db.collection<ResumeDocument>("resumes");
}

export const resumeRepository = new ResumeRepository(defaultCollection);
