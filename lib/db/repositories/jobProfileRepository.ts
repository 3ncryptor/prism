import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { JobProfile } from "@/lib/schemas/jobProfile";

export type JobProfileDocument = Omit<JobProfile, "_id"> & { _id: ObjectId };

function toJobProfile(doc: JobProfileDocument): JobProfile {
  return { ...doc, _id: doc._id.toString() };
}

export class JobProfileRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<JobProfileDocument>>,
  ) {}

  async save(profile: Omit<JobProfile, "_id">): Promise<JobProfile> {
    const collection = await this.getCollection();
    const doc: JobProfileDocument = { _id: new ObjectId(), ...profile };
    await collection.insertOne(doc);
    return toJobProfile(doc);
  }

  async getByJobId(jobId: string): Promise<JobProfile | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ jobId });
    return doc ? toJobProfile(doc) : null;
  }
}

async function defaultCollection(): Promise<Collection<JobProfileDocument>> {
  const db = await getDb();
  return db.collection<JobProfileDocument>("jobProfiles");
}

export const jobProfileRepository = new JobProfileRepository(defaultCollection);
