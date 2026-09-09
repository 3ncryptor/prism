import { ObjectId } from "mongodb";

type Doc = { _id: ObjectId };

function matches<T extends Doc>(doc: T, filter: Partial<T>): boolean {
  return Object.entries(filter).every(([key, value]) => {
    const docValue = (doc as Record<string, unknown>)[key];
    if (value instanceof ObjectId) {
      return docValue instanceof ObjectId && docValue.equals(value);
    }
    return docValue === value;
  });
}

/**
 * Minimal in-memory stand-in for a MongoDB `Collection<T>`, implementing
 * only the operations Prism's repositories actually use. Used in place of
 * a real database in tests — `mongodb-memory-server` hit a handshake
 * incompatibility with this environment's MongoDB driver version, so real
 * integration testing is deferred until a real MONGODB_URI (Atlas) exists.
 */
export class FakeCollection<T extends Doc> {
  private docs: T[] = [];

  async findOne(filter: Partial<T>): Promise<T | null> {
    return this.docs.find((doc) => matches(doc, filter)) ?? null;
  }

  async insertOne(doc: T): Promise<{ insertedId: ObjectId }> {
    this.docs.push(doc);
    return { insertedId: doc._id };
  }

  async findOneAndUpdate(
    filter: Partial<T>,
    update: { $set?: Partial<T>; $setOnInsert?: Partial<T> },
    options: { upsert?: boolean } = {},
  ): Promise<T | null> {
    const existing = this.docs.find((doc) => matches(doc, filter));
    if (!existing) {
      if (!options.upsert) return null;
      // Real MongoDB merges the filter's equality fields into a
      // newly-created upserted document — replicate that here, otherwise
      // e.g. an `{ email }` filter wouldn't end up on the created doc.
      const created = {
        _id: new ObjectId(),
        ...filter,
        ...(update.$setOnInsert ?? {}),
        ...(update.$set ?? {}),
      } as T;
      this.docs.push(created);
      return created;
    }
    Object.assign(existing, update.$set ?? {});
    return existing;
  }

  async deleteMany(): Promise<void> {
    this.docs = [];
  }

  async countDocuments(filter: Partial<T> = {}): Promise<number> {
    return this.docs.filter((doc) => matches(doc, filter)).length;
  }

  async find(filter: Partial<T> = {}): Promise<{ toArray: () => Promise<T[]> }> {
    const results = this.docs.filter((doc) => matches(doc, filter));
    return { toArray: async () => results };
  }
}
