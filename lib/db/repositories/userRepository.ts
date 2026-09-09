import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { User, UserRole } from "@/lib/schemas/user";

export interface UserDocument {
  _id: ObjectId;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
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

  async create(input: {
    email: string;
    name: string;
    passwordHash: string;
    role: UserRole;
  }): Promise<User> {
    const collection = await this.getCollection();
    const now = new Date();
    const doc: UserDocument = { _id: new ObjectId(), ...input, createdAt: now, updatedAt: now };
    await collection.insertOne(doc);
    return toUser(doc);
  }

  /** Used by scripts/seed.ts so re-running the seed is idempotent. */
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
}

async function defaultCollection(): Promise<Collection<UserDocument>> {
  const db = await getDb();
  return db.collection<UserDocument>("users");
}

export const userRepository = new UserRepository(defaultCollection);
