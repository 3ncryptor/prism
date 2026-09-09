/**
 * Scoped env accessors: each function validates only the variable(s) it
 * actually needs, so a feature that only touches Mongo (e.g. Auth) isn't
 * blocked by missing Redis/S3/Qdrant/LLM config it never reads. Lazy by
 * design — nothing here runs at module-import time, so `next build`
 * doesn't require any secrets to exist (docs/agent-artifacts/
 * 01-project-foundation/spec.md edge case).
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. See .env.example.`,
    );
  }
  return value;
}

export function getMongoUri(): string {
  return requireEnv("MONGODB_URI");
}

export function getRedisUrl(): string {
  return requireEnv("REDIS_URL");
}

export function getQdrantConfig(): { url: string; apiKey?: string } {
  return { url: requireEnv("QDRANT_URL"), apiKey: process.env.QDRANT_API_KEY };
}

export function getS3Config(): {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
} {
  return {
    endpoint: process.env.S3_ENDPOINT,
    // Real AWS needs a real region; MinIO/R2-style endpoints ignore it but
    // the AWS SDK still requires the field to be present.
    region: process.env.AWS_REGION || "us-east-1",
    bucket: requireEnv("S3_BUCKET"),
    accessKey: requireEnv("S3_ACCESS_KEY"),
    secretKey: requireEnv("S3_SECRET_KEY"),
  };
}

export type ExtractionProviderName = "gemini" | "claude";
export type EmbeddingProviderName = "gemini" | "openai";

export function getExtractionProviderName(): ExtractionProviderName {
  const value = requireEnv("EXTRACTION_PROVIDER");
  if (value !== "gemini" && value !== "claude") {
    throw new Error(
      `EXTRACTION_PROVIDER must be "gemini" or "claude", got "${value}"`,
    );
  }
  return value;
}

export function getEmbeddingProviderName(): EmbeddingProviderName {
  const value = requireEnv("EMBEDDING_PROVIDER");
  if (value !== "gemini" && value !== "openai") {
    throw new Error(
      `EMBEDDING_PROVIDER must be "gemini" or "openai", got "${value}"`,
    );
  }
  return value;
}

export function getGeminiApiKey(): string {
  return requireEnv("GEMINI_API_KEY");
}

export function getAnthropicApiKey(): string {
  return requireEnv("ANTHROPIC_API_KEY");
}

export function getOpenAiApiKey(): string {
  return requireEnv("OPENAI_API_KEY");
}
