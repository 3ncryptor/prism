import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiApiKey } from "@/lib/config/env";
import { buildResumeExtractionPrompt } from "@/lib/extraction/prompts/resume-extraction-v1";
import { buildJDExtractionPrompt } from "@/lib/extraction/prompts/jd-extraction-v1";
import type { ExtractionProvider } from "@/lib/extraction/extractionProvider";

// gemini-2.0-flash was retired; Google's own API error pointed at this
// replacement directly (verified live against the real API, not from
// training-data memory, which is stale here per buildPlan.md's
// "prefer evidence over memory" research principle).
const DEFAULT_MODEL = "gemini-3.6-flash";

async function generateJson(modelId: string, prompt: string): Promise<unknown> {
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent(prompt);
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
