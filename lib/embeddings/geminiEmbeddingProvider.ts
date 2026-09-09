import { getGeminiApiKey } from "@/lib/config/env";
import type { EmbeddingProvider } from "@/lib/embeddings/embeddingProvider";

// gemini-embedding-001 verified live (2026-09-09): native output is 3072
// dims, but the real Pinecone index (prism-index) was created with
// dimension 768. Rather than recreate that index, we use the model's
// documented Matryoshka truncation via `outputDimensionality` — verified
// live to return exactly 768-dim vectors on both embedContent and
// batchEmbedContents. The installed @google/generative-ai SDK's types
// don't expose this field, so we call the REST endpoints directly.
const MODEL_ID = "gemini-embedding-001";
const OUTPUT_DIMENSIONS = 768;
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

interface BatchEmbedResponse {
  embeddings: { values: number[] }[];
}

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly modelId = MODEL_ID;
  readonly dimensions = OUTPUT_DIMENSIONS;

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const response = await fetch(
      `${API_BASE}/models/${MODEL_ID}:batchEmbedContents?key=${getGeminiApiKey()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: texts.map((text) => ({
            model: `models/${MODEL_ID}`,
            content: { parts: [{ text }] },
            outputDimensionality: OUTPUT_DIMENSIONS,
          })),
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini embedding request failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as BatchEmbedResponse;
    return data.embeddings.map((e) => e.values);
  }
}
