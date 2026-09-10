import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { User, UserRole } from "@/lib/schemas/user";

export interface UserDocument {
  _id: ObjectId;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  phone?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  rollNumber?: string;
  branch?: string;
  batchYear?: number;
  emailVerified?: Date;
  createdAt: Date;
  updatedAt: Date;
}

function toUser(doc: UserDocument): User {
  return {
    _id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    role: doc.role,
    passwordHash: doc.passwordHash,
    phone: doc.phone,
    linkedinUrl: doc.linkedinUrl,
    githubUrl: doc.githubUrl,
    portfolioUrl: doc.portfolioUrl,
    rollNumber: doc.rollNumber,
    branch: doc.branch,
    batchYear: doc.batchYear,
    emailVerified: doc.emailVerified,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class UserRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<UserDocument>>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ email });
    return doc ? toUser(doc) : null;
  }

  async findById(id: string): Promise<User | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    return doc ? toUser(doc) : null;
  }

  /** Batch lookup for admin result tables — avoids N individual queries. */
  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const collection = await this.getCollection();
    const docs = await collection.find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }).toArray();
    return docs.map(toUser);
  }

  /**
   * `emailVerified` defaults to "now" (already verified) when omitted —
   * every existing caller (seed, admin-provisioning) creates accounts that
   * never went through self-serve signup, so there's nothing to verify.
   * Only `signupService` passes `emailVerified: null` explicitly.
   */
  async create(input: {
    email: string;
    name: string;
    passwordHash: string;
    role: UserRole;
    emailVerified?: Date | null;
  }): Promise<User> {
    const collection = await this.getCollection();
    const now = new Date();
    const { emailVerified, ...rest } = input;
    const doc: UserDocument = {
      _id: new ObjectId(),
      ...rest,
      emailVerified: emailVerified === undefined ? now : (emailVerified ?? undefined),
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    return toUser(doc);
  }

  /** Used by scripts/seed.ts so re-running the seed is idempotent. Always
   * verified — seeded accounts never go through self-serve signup. */
  async upsertByEmail(input: {
    email: string;
    name: string;
    passwordHash: string;
    role: UserRole;
  }): Promise<User> {
    const collection = await this.getCollection();
    const now = new Date();
    const result = await collection.findOneAndUpdate(
      { email: input.email },
      {
        $set: {
          name: input.name,
          passwordHash: input.passwordHash,
          role: input.role,
          emailVerified: now,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!result) {
      throw new Error(`upsertByEmail failed to return a document for ${input.email}`);
    }
    return toUser(result);
  }

  /** docs/screens.md §7.7 (feature 28): marks a self-serve signup verified after the emailed link is clicked. */
  async markEmailVerified(userId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { emailVerified: new Date(), updatedAt: new Date() } },
    );
  }

  /** docs/screens.md §4.8 (feature 27f). */
  async updateProfile(
    userId: string,
    patch: Partial<
      Pick<User, "name" | "phone" | "linkedinUrl" | "githubUrl" | "portfolioUrl" | "rollNumber" | "branch" | "batchYear">
    >,
  ): Promise<User | null> {
    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return result ? toUser(result) : null;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { passwordHash, updatedAt: new Date() } },
    );
  }
}

async function defaultCollection(): Promise<Collection<UserDocument>> {
  const db = await getDb();
  return db.collection<UserDocument>("users");
}

export const userRepository = new UserRepository(defaultCollection);
