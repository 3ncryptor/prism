/** buildPlan.md §115a — provider-abstracted, Pinecone now, Qdrant swappable later. */
export interface VectorPoint {
  id: string;
  vector: number[];
  metadata: Record<string, string | number | boolean | string[]>;
}

export interface VectorSearchMatch {
  id: string;
  score: number;
  metadata: Record<string, string | number | boolean | string[]>;
}

export interface VectorStoreProvider {
  upsert(namespace: string, points: VectorPoint[]): Promise<void>;
  search(
    namespace: string,
    vector: number[],
    filter: Record<string, string>,
    topK: number,
  ): Promise<VectorSearchMatch[]>;
  delete(namespace: string, ids: string[]): Promise<void>;
}
