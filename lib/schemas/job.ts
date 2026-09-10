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

// docs/screens.md §4.10 (feature 27c): a listing lifecycle distinct from
// both `status` (the extraction pipeline) and `publishedMatchRunId` (the
// results visibility toggle) — a JD defaults to DRAFT once parsing
// finishes, and Run Matching is disabled until an admin flips it to LIVE.
export const jobListingStatusSchema = z.enum(["DRAFT", "LIVE"]);
export type JobListingStatus = z.infer<typeof jobListingStatusSchema>;

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
  listingStatus: jobListingStatusSchema,
  leaderboardSize: z.number().int().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Job = z.infer<typeof jobSchema>;
