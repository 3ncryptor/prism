/** buildPlan.md §5.5/§5.7 — provider-abstracted, selected by env var. */
export interface EmbeddingProvider {
  readonly modelId: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}
