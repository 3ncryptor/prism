import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { PasswordResetToken } from "@/lib/schemas/passwordResetToken";

export type PasswordResetTokenDocument = Omit<PasswordResetToken, "_id"> & { _id: ObjectId };

function toToken(doc: PasswordResetTokenDocument): PasswordResetToken {
  return { ...doc, _id: doc._id.toString() };
}

/** docs/screens.md §4.3/§4.4 (feature 27g). */
export class PasswordResetTokenRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<PasswordResetTokenDocument>>,
  ) {}

  async create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<PasswordResetToken> {
    const collection = await this.getCollection();
    const doc: PasswordResetTokenDocument = {
      _id: new ObjectId(),
      ...input,
      usedAt: null,
      createdAt: new Date(),
    };
    await collection.insertOne(doc);
    return toToken(doc);
  }

  /** Not-yet-used and not-yet-expired, as of `now`. */
  async findValidByTokenHash(tokenHash: string, now: Date = new Date()): Promise<PasswordResetToken | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ tokenHash, usedAt: null, expiresAt: { $gt: now } });
    return doc ? toToken(doc) : null;
  }

  async markUsed(id: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { usedAt: new Date() } });
  }
}

async function defaultCollection(): Promise<Collection<PasswordResetTokenDocument>> {
  const db = await getDb();
  return db.collection<PasswordResetTokenDocument>("passwordResetTokens");
}

export const passwordResetTokenRepository = new PasswordResetTokenRepository(defaultCollection);
