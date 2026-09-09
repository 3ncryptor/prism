import { Pinecone } from "@pinecone-database/pinecone";
import type {
  VectorPoint,
  VectorSearchMatch,
  VectorStoreProvider,
} from "@/lib/vectorStore/vectorStoreProvider";
import { logger } from "@/lib/logger";
import { withTiming } from "@/lib/observability/timing";

function getIndexName(): string {
  const value = process.env.PINECONE_INDEX;
  if (!value) {
    throw new Error("Missing required environment variable: PINECONE_INDEX. See .env.example.");
  }
  return value;
}

function getApiKey(): string {
  const value = process.env.PINECONE_API_KEY;
  if (!value) {
    throw new Error("Missing required environment variable: PINECONE_API_KEY. See .env.example.");
  }
  return value;
}

/** buildPlan.md §115a — Pinecone implementation of VectorStoreProvider. */
export class PineconeVectorStoreProvider implements VectorStoreProvider {
  private client: Pinecone | null = null;

  private getClient(): Pinecone {
    if (!this.client) {
      this.client = new Pinecone({ apiKey: getApiKey() });
    }
    return this.client;
  }

  async upsert(namespace: string, points: VectorPoint[]): Promise<void> {
    if (points.length === 0) return;
    await withTiming(
      logger,
      "vectorstore.upsert",
      async () => {
        const index = this.getClient().index(getIndexName()).namespace(namespace);
        await index.upsert({
          records: points.map((point) => ({
            id: point.id,
            values: point.vector,
            metadata: point.metadata,
          })),
        });
      },
      { level: "debug", extra: { namespace, count: points.length } },
    );
  }

  async search(
    namespace: string,
    vector: number[],
    filter: Record<string, string>,
    topK: number,
  ): Promise<VectorSearchMatch[]> {
    return withTiming(
      logger,
      "vectorstore.search",
      async () => {
        const index = this.getClient().index(getIndexName()).namespace(namespace);
        const response = await index.query({
          vector,
          topK,
          includeMetadata: true,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
        });
        return response.matches.map((match) => ({
          id: match.id,
          score: match.score ?? 0,
          metadata: (match.metadata ?? {}) as VectorSearchMatch["metadata"],
        }));
      },
      { level: "debug", extra: { namespace, topK } },
    );
  }

  async delete(namespace: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const index = this.getClient().index(getIndexName()).namespace(namespace);
    await index.deleteMany({ ids });
  }
}
