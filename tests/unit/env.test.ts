import { loadEnv, resetEnvCacheForTests } from "@/lib/config/env";

const REQUIRED_BASE_ENV = {
  MONGODB_URI: "mongodb://localhost:27017/prism-test",
  REDIS_URL: "redis://localhost:6379",
  QDRANT_URL: "http://localhost:6333",
  S3_BUCKET: "test-bucket",
  S3_ACCESS_KEY: "test-access-key",
  S3_SECRET_KEY: "test-secret-key",
  AUTH_SECRET: "test-auth-secret",
};

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
  "AUTH_SECRET",
] as const;

function setTestEnv(vars: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, vars);
}

describe("loadEnv", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetEnvCacheForTests();
  });

  afterAll(() => {
    Object.assign(process.env, originalEnv);
  });

  it("throws a clear, listed error when required vars are missing", () => {
    setTestEnv({});

    expect(() => loadEnv()).toThrow(/Invalid environment configuration[\s\S]*MONGODB_URI/);
  });

  it("returns validated env when EXTRACTION_PROVIDER=gemini and its key is present", () => {
    setTestEnv({
      ...REQUIRED_BASE_ENV,
      EXTRACTION_PROVIDER: "gemini",
      EMBEDDING_PROVIDER: "gemini",
      GEMINI_API_KEY: "test-gemini-key",
    });

    const env = loadEnv();

    expect(env.EXTRACTION_PROVIDER).toBe("gemini");
    expect(env.GEMINI_API_KEY).toBe("test-gemini-key");
  });

  it("throws when EXTRACTION_PROVIDER=claude but ANTHROPIC_API_KEY is missing", () => {
    setTestEnv({
      ...REQUIRED_BASE_ENV,
      EXTRACTION_PROVIDER: "claude",
      EMBEDDING_PROVIDER: "openai",
      OPENAI_API_KEY: "test-openai-key",
    });

    expect(() => loadEnv()).toThrow(/ANTHROPIC_API_KEY is required/);
  });

  it("caches the validated env across calls", () => {
    setTestEnv({
      ...REQUIRED_BASE_ENV,
      EXTRACTION_PROVIDER: "gemini",
      EMBEDDING_PROVIDER: "gemini",
      GEMINI_API_KEY: "test-gemini-key",
    });

    const first = loadEnv();
    process.env.MONGODB_URI = "mongodb://should-be-ignored/db";
    const second = loadEnv();

    expect(second).toBe(first);
    expect(second.MONGODB_URI).toBe(REQUIRED_BASE_ENV.MONGODB_URI);
  });
});
