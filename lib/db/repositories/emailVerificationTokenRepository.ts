import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { EmailVerificationToken } from "@/lib/schemas/emailVerificationToken";

export type EmailVerificationTokenDocument = Omit<EmailVerificationToken, "_id"> & { _id: ObjectId };

function toToken(doc: EmailVerificationTokenDocument): EmailVerificationToken {
  return { ...doc, _id: doc._id.toString() };
}

/** docs/screens.md §7.7 (feature 28). Mirrors passwordResetTokenRepository.ts exactly. */
export class EmailVerificationTokenRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<EmailVerificationTokenDocument>>,
  ) {}

  async create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<EmailVerificationToken> {
    const collection = await this.getCollection();
    const doc: EmailVerificationTokenDocument = {
      _id: new ObjectId(),
      ...input,
      usedAt: null,
      createdAt: new Date(),
    };
    await collection.insertOne(doc);
    return toToken(doc);
  }

  /** Not-yet-used and not-yet-expired, as of `now`. */
  async findValidByTokenHash(tokenHash: string, now: Date = new Date()): Promise<EmailVerificationToken | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ tokenHash, usedAt: null, expiresAt: { $gt: now } });
    return doc ? toToken(doc) : null;
  }

  async markUsed(id: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { usedAt: new Date() } });
  }
}

async function defaultCollection(): Promise<Collection<EmailVerificationTokenDocument>> {
  const db = await getDb();
  return db.collection<EmailVerificationTokenDocument>("emailVerificationTokens");
}

export const emailVerificationTokenRepository = new EmailVerificationTokenRepository(defaultCollection);
