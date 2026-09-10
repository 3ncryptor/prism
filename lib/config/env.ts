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

/** docs/screens.md §4.3 (feature 27g): the absolute origin embedded in password-reset links. */
export function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/**
 * docs/screens.md §4.3/§4.4 (feature 27g). Returns null (never throws) when
 * unconfigured — lib/email/index.ts falls back to a console-logging dev
 * provider so local development and CI never require real SMTP
 * credentials, matching this project's provider-abstraction philosophy
 * (buildPlan.md §5.7): switching providers is an environment-config
 * change, not a code branch.
 */
export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  return {
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    user,
    pass,
    from: process.env.SMTP_FROM || user,
  };
}
