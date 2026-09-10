import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from "@google/generative-ai";
import { getGeminiApiKey } from "@/lib/config/env";
import { buildResumeExtractionPrompt } from "@/lib/extraction/prompts/resume-extraction-v1";
import { buildJDExtractionPrompt } from "@/lib/extraction/prompts/jd-extraction-v1";
import { ExtractionQuotaExceededError, type ExtractionProvider } from "@/lib/extraction/extractionProvider";
import { logger } from "@/lib/logger";
import { withTiming } from "@/lib/observability/timing";

// gemini-2.0-flash was retired; Google's own API error pointed at this
// replacement directly (verified live against the real API, not from
// training-data memory, which is stale here per buildPlan.md's
// "prefer evidence over memory" research principle).
const DEFAULT_MODEL = "gemini-3.6-flash";

// 503 ("high demand", per Google's own error text) and 429 (rate limit) are
// the two statuses Google's own docs describe as transient/retry-worthy;
// anything else (400 bad request, auth errors, etc.) is a real failure that
// retrying won't fix.
const RETRYABLE_STATUS_CODES = new Set([429, 503]);
const MAX_ATTEMPTS = 4; // 1 initial call + 3 retries
const BASE_RETRY_DELAY_MS = 1000;

/**
 * A 429 can mean two very different things: a short-lived per-minute rate
 * limit (worth retrying) or a hard daily quota cap (retrying cannot help
 * until the quota resets, no matter how many attempts are spent). Google's
 * own `errorDetails` distinguishes them via a `QuotaFailure` violation
 * whose `quotaId` names the period — e.g.
 * "GenerateRequestsPerDayPerProjectPerModel-FreeTier" — verified live
 * against the actual error shape hit in this project, not assumed.
 */
function isDailyQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof GoogleGenerativeAIFetchError) || error.status !== 429) return false;
  return (error.errorDetails ?? []).some((detail) => {
    const violations = (detail as { violations?: unknown }).violations;
    if (!Array.isArray(violations)) return false;
    return violations.some(
      (violation) => typeof (violation as { quotaId?: unknown }).quotaId === "string" && (violation as { quotaId: string }).quotaId.includes("PerDay"),
    );
  });
}

function isRetryableGeminiError(error: unknown): boolean {
  return (
    error instanceof GoogleGenerativeAIFetchError &&
    error.status !== undefined &&
    RETRYABLE_STATUS_CODES.has(error.status) &&
    !isDailyQuotaExceededError(error)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type GenerateContentFn = (prompt: string) => Promise<{ response: { text: () => string } }>;

/**
 * Retries only on transient Gemini errors (503/429) with exponential
 * backoff (1s, 2s, 4s) — a single moment of "high demand" (a real,
 * observed failure mode: buildPlan.md's evidence-over-memory principle
 * applies here too, this was hit live) shouldn't fail an entire resume/JD
 * processing job. Non-retryable errors (bad input, auth, JSON parsing)
 * propagate immediately.
 */
export async function generateContentWithRetry(
  generateContent: GenerateContentFn,
  prompt: string,
): Promise<{ response: { text: () => string } }> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await generateContent(prompt);
    } catch (error) {
      if (attempt === MAX_ATTEMPTS || !isRetryableGeminiError(error)) {
        throw error;
      }
      logger.warn({ attempt, maxAttempts: MAX_ATTEMPTS, err: error }, "Gemini request failed, retrying");
      await sleep(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  throw new Error("unreachable");
}

async function generateJson(modelId: string, prompt: string): Promise<unknown> {
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: { responseMimeType: "application/json" },
  });

  let result: { response: { text: () => string } };
  try {
    result = await withTiming(
      logger,
      "gemini.generateContent",
      () => generateContentWithRetry((p) => model.generateContent(p), prompt),
      { extra: { model: modelId } },
    );
  } catch (error) {
    // Translate the vendor-specific daily-quota error into the shared,
    // provider-agnostic error before it reaches callers (the document
    // worker, ultimately the student-facing UI) — those layers should
    // never need to know Gemini's error shape, and must never surface the
    // raw multi-paragraph vendor error text to an end user.
    if (isDailyQuotaExceededError(error)) {
      logger.error({ err: error, model: modelId }, "Gemini daily request quota exhausted");
      throw new ExtractionQuotaExceededError();
    }
    throw error;
  }
  const responseText = result.response.text();

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(`Gemini returned non-JSON output: ${responseText.slice(0, 200)}`);
  }
}

/** Dev provider per buildPlan.md §5.7's finalized matrix. */
export class GeminiExtractionProvider implements ExtractionProvider {
  readonly modelId = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;

  async extractResume(text: string): Promise<unknown> {
    return generateJson(this.modelId, buildResumeExtractionPrompt(text));
  }

  async extractJD(text: string): Promise<unknown> {
    return generateJson(this.modelId, buildJDExtractionPrompt(text));
  }
}
