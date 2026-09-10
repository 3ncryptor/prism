import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { StudentProfile } from "@/lib/schemas/studentProfile";

export type StudentProfileDocument = Omit<StudentProfile, "_id"> & { _id: ObjectId };

function toStudentProfile(doc: StudentProfileDocument): StudentProfile {
  return { ...doc, _id: doc._id.toString() };
}

export class StudentProfileRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<StudentProfileDocument>>,
  ) {}

  /**
   * Marks any previously-active profile for this student inactive, then
   * inserts `profile` as the new active one (buildPlan.md §55) — a resume
   * replacement must not leave two profiles simultaneously active.
   */
  async save(
    profile: Omit<StudentProfile, "_id">,
    opts: { markActive: boolean },
  ): Promise<StudentProfile> {
    const collection = await this.getCollection();
    if (opts.markActive) {
      await collection.updateMany(
        { studentId: profile.studentId, isActive: true },
        { $set: { isActive: false } },
      );
    }
    const doc: StudentProfileDocument = { _id: new ObjectId(), ...profile };
    await collection.insertOne(doc);
    return toStudentProfile(doc);
  }

  async getActiveByStudent(studentId: string): Promise<StudentProfile | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ studentId, isActive: true });
    return doc ? toStudentProfile(doc) : null;
  }

  /** docs/screens.md §4.6 (feature 27d): "View parsed profile" for a specific resume. */
  async getByResumeId(resumeId: string): Promise<StudentProfile | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ resumeId });
    return doc ? toStudentProfile(doc) : null;
  }

  /**
   * docs/screens.md §4.6 (feature 27d): mirrors a Resume publish/unpublish
   * toggle onto its StudentProfile. Publishing deactivates every other
   * profile for the student first — same single-active invariant `save`
   * already enforces, kept until 27e's role-based routing allows more than
   * one active profile per student at once.
   */
  async setActiveForResume(studentId: string, resumeId: string, isActive: boolean): Promise<void> {
    const collection = await this.getCollection();
    if (isActive) {
      await collection.updateMany({ studentId, isActive: true }, { $set: { isActive: false } });
    }
    await collection.updateOne({ resumeId }, { $set: { isActive } });
  }

  /** V1: full population, no candidate pre-filter (buildPlan.md §23). */
  async listAllActive(): Promise<StudentProfile[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({ isActive: true }).toArray();
    return docs.map(toStudentProfile);
  }

  /** buildPlan.md §116: usage count for the skill taxonomy admin table. */
  async countReferencingSkill(canonicalName: string): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments({ "skills.canonicalName": canonicalName });
  }
}

async function defaultCollection(): Promise<Collection<StudentProfileDocument>> {
  const db = await getDb();
  return db.collection<StudentProfileDocument>("studentProfiles");
}

export const studentProfileRepository = new StudentProfileRepository(defaultCollection);
