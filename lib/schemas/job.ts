import { z } from "zod";

export const jobStatusSchema = z.enum([
  "UPLOADED",
  "QUEUED",
  "EXTRACTING",
  "EXTRACTED",
  "STRUCTURING",
  "VALIDATING",
  "INDEXING",
  "READY",
  "FAILED",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

// The JD lifecycle/file entity — distinct from JobProfile (the extracted
// structured content). buildPlan.md §113.2 adds publishedMatchRunId.
export const jobSchema = z.object({
  _id: z.string(),
  title: z.string(),
  company: z.string().optional(),
  fileKey: z.string(),
  createdBy: z.string(),
  status: jobStatusSchema,
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  archived: z.boolean(),
  publishedMatchRunId: z.string().nullable(),
  publishedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Job = z.infer<typeof jobSchema>;
