/** docs/BACKEND_ARCHITECTURE.md §4. Returns raw, unvalidated JSON — callers Zod-validate. */
export interface ExtractionProvider {
  readonly modelId: string;
  extractResume(text: string, promptVersion: string): Promise<unknown>;
  extractJD(text: string, promptVersion: string): Promise<unknown>;
}
