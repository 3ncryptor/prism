/** docs/BACKEND_ARCHITECTURE.md §4. Returns raw, unvalidated JSON — callers Zod-validate. */
export interface ExtractionProvider {
  readonly modelId: string;
  extractResume(text: string, promptVersion: string): Promise<unknown>;
  extractJD(text: string, promptVersion: string): Promise<unknown>;
}

/**
 * Thrown by any `ExtractionProvider` implementation when the underlying
 * vendor reports its request quota is exhausted for a period retrying
 * within this job cannot shorten (e.g. a daily free-tier cap) — as opposed
 * to a transient rate limit, which the provider should already retry
 * internally. Kept on the shared interface (not the Gemini-specific
 * module) so callers like the document worker can react to it without
 * depending on which concrete provider is configured (buildPlan.md §5.7).
 */
export class ExtractionQuotaExceededError extends Error {
  constructor(message = "The extraction service has reached its request quota. Please try again later.") {
    super(message);
    this.name = "ExtractionQuotaExceededError";
  }
}
