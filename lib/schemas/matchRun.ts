import { z } from "zod";

/** buildPlan.md §45. */
export const matchRunStatusSchema = z.enum(["QUEUED", "RUNNING", "COMPLETED", "FAILED"]);
export type MatchRunStatus = z.infer<typeof matchRunStatusSchema>;

export const matchRunSchema = z.object({
  _id: z.string(),
  jobId: z.string(),
  status: matchRunStatusSchema,
  scoringConfigVersion: z.string(),
  extractionModelVersion: z.string(),
  embeddingModelVersion: z.string(),
  candidateCount: z.number(),
  processedCount: z.number(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
});
export type MatchRun = z.infer<typeof matchRunSchema>;
