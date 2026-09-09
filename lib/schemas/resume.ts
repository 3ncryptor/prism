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

export const resumeSchema = z.object({
  _id: z.string(),
  studentId: z.string(),
  fileKey: z.string(),
  originalName: z.string(),
  isActive: z.boolean(),
  status: resumeStatusSchema,
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Resume = z.infer<typeof resumeSchema>;
