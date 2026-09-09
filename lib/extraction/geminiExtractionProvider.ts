import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from "@google/generative-ai";
import { getGeminiApiKey } from "@/lib/config/env";
import { buildResumeExtractionPrompt } from "@/lib/extraction/prompts/resume-extraction-v1";
import { buildJDExtractionPrompt } from "@/lib/extraction/prompts/jd-extraction-v1";
import type { ExtractionProvider } from "@/lib/extraction/extractionProvider";

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

function isRetryableGeminiError(error: unknown): boolean {
  return (
    error instanceof GoogleGenerativeAIFetchError &&
    error.status !== undefined &&
    RETRYABLE_STATUS_CODES.has(error.status)
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

  const result = await generateContentWithRetry(
    (p) => model.generateContent(p),
    prompt,
  );
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
