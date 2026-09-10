import { z } from "zod";

export const resumeStatusSchema = z.enum([
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
export type ResumeStatus = z.infer<typeof resumeStatusSchema>;

// docs/screens.md §4.6 (feature 27d): a student can hold several resumes at
// once — `label` is how they tell them apart ("Data Science Resume").
// `isActive` is repurposed from "the single most-recently-uploaded resume"
// to "published for matching" — the student explicitly toggles it, upload
// no longer flips it automatically. At most one resume is active per
// student until feature 27e's role-based routing allows more.
export const resumeSchema = z.object({
  _id: z.string(),
  studentId: z.string(),
  label: z.string().min(1),
  // docs/screens.md §4.6/§4.11 (feature 27e): null = global/generic resume,
  // used for any job with no role-specific published resume. A select-only
  // tag from the admin-managed job role taxonomy — never free text.
  jobRole: z.string().nullable(),
  fileKey: z.string(),
  originalName: z.string(),
  isActive: z.boolean(),
  status: resumeStatusSchema,
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Resume = z.infer<typeof resumeSchema>;
