import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import type { AuditLog } from "@/lib/schemas/auditLog";

export type AuditLogDocument = Omit<AuditLog, "_id"> & { _id: ObjectId };

function toAuditLog(doc: AuditLogDocument): AuditLog {
  return { ...doc, _id: doc._id.toString() };
}

export class AuditLogRepository {
  constructor(
    private readonly getCollection: () => Promise<Collection<AuditLogDocument>>,
  ) {}

  async create(entry: Omit<AuditLog, "_id" | "createdAt">): Promise<AuditLog> {
    const collection = await this.getCollection();
    const doc: AuditLogDocument = { _id: new ObjectId(), ...entry, createdAt: new Date() };
    await collection.insertOne(doc);
    return toAuditLog(doc);
  }

  async listRecent(limit = 100): Promise<AuditLog[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
    return docs.map(toAuditLog);
  }
}

async function defaultCollection(): Promise<Collection<AuditLogDocument>> {
  const db = await getDb();
  return db.collection<AuditLogDocument>("auditLogs");
}

export const auditLogRepository = new AuditLogRepository(defaultCollection);
