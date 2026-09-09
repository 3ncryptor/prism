import {
  getMongoUri,
  getRedisUrl,
  getQdrantConfig,
  getS3Config,
  getExtractionProviderName,
  getEmbeddingProviderName,
} from "@/lib/config/env";

const ENV_KEYS = [
  "MONGODB_URI",
  "REDIS_URL",
  "QDRANT_URL",
  "QDRANT_API_KEY",
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "EXTRACTION_PROVIDER",
  "EMBEDDING_PROVIDER",
  "GEMINI_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
] as const;

function setTestEnv(vars: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, vars);
}

describe("env getters", () => {
  const originalEnv = { ...process.env };

  afterAll(() => {
    Object.assign(process.env, originalEnv);
  });

  it("getMongoUri throws a clear error when missing, without requiring any other var", () => {
    setTestEnv({});

    expect(() => getMongoUri()).toThrow(/MONGODB_URI/);
  });

  it("getMongoUri returns the value when set, independent of Redis/S3/Qdrant/LLM vars", () => {
    setTestEnv({ MONGODB_URI: "mongodb://localhost:27017/test" });

    expect(getMongoUri()).toBe("mongodb://localhost:27017/test");
  });

  it("getRedisUrl throws when missing", () => {
    setTestEnv({});

    expect(() => getRedisUrl()).toThrow(/REDIS_URL/);
  });

  it("getQdrantConfig returns url + optional apiKey", () => {
    setTestEnv({ QDRANT_URL: "http://localhost:6333", QDRANT_API_KEY: "key" });

    expect(getQdrantConfig()).toEqual({
      url: "http://localhost:6333",
      apiKey: "key",
    });
  });

  it("getS3Config throws when a required field is missing", () => {
    setTestEnv({ S3_BUCKET: "bucket" });

    expect(() => getS3Config()).toThrow(/S3_ACCESS_KEY/);
  });

  it("getExtractionProviderName rejects an invalid value", () => {
    setTestEnv({ EXTRACTION_PROVIDER: "not-a-provider" });

    expect(() => getExtractionProviderName()).toThrow(/EXTRACTION_PROVIDER/);
  });

  it("getEmbeddingProviderName accepts a valid value", () => {
    setTestEnv({ EMBEDDING_PROVIDER: "openai" });

    expect(getEmbeddingProviderName()).toBe("openai");
  });
});
