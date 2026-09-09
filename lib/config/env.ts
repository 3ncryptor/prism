import { z } from "zod";

const envSchema = z
  .object({
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    REDIS_URL: z.string().min(1, "REDIS_URL is required"),
    QDRANT_URL: z.string().min(1, "QDRANT_URL is required"),
    QDRANT_API_KEY: z.string().optional(),

    S3_ENDPOINT: z.string().optional(),
    S3_BUCKET: z.string().min(1, "S3_BUCKET is required"),
    S3_ACCESS_KEY: z.string().min(1, "S3_ACCESS_KEY is required"),
    S3_SECRET_KEY: z.string().min(1, "S3_SECRET_KEY is required"),

    EXTRACTION_PROVIDER: z.enum(["gemini", "claude"]),
    EMBEDDING_PROVIDER: z.enum(["gemini", "openai"]),
    GEMINI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),

    AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  })
  .superRefine((env, ctx) => {
    const requireKey = (
      condition: boolean,
      key: "GEMINI_API_KEY" | "ANTHROPIC_API_KEY" | "OPENAI_API_KEY",
      because: string,
    ) => {
      if (condition && !env[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required because ${because}`,
        });
      }
    };

    requireKey(
      env.EXTRACTION_PROVIDER === "gemini",
      "GEMINI_API_KEY",
      "EXTRACTION_PROVIDER=gemini",
    );
    requireKey(
      env.EXTRACTION_PROVIDER === "claude",
      "ANTHROPIC_API_KEY",
      "EXTRACTION_PROVIDER=claude",
    );
    requireKey(
      env.EMBEDDING_PROVIDER === "gemini",
      "GEMINI_API_KEY",
      "EMBEDDING_PROVIDER=gemini",
    );
    requireKey(
      env.EMBEDDING_PROVIDER === "openai",
      "OPENAI_API_KEY",
      "EMBEDDING_PROVIDER=openai",
    );
  });

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Validates process.env against the required Prism configuration surface.
 * Lazy by design (buildPlan.md §115 config layer, edge case in
 * docs/agent-artifacts/01-project-foundation/spec.md): must not run at
 * module-import time, since Next.js evaluates some modules during
 * `next build`, which should not require production secrets to exist.
 */
export function loadEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/** Test-only escape hatch to force re-validation against a mutated process.env. */
export function resetEnvCacheForTests(): void {
  cachedEnv = null;
}
