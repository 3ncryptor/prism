import { z } from "zod";

export const processingJobTypeSchema = z.enum(["RESUME_PROCESS", "JD_PROCESS"]);
export type ProcessingJobType = z.infer<typeof processingJobTypeSchema>;

export const processingJobSchema = z.object({
  _id: z.string(),
  type: processingJobTypeSchema,
  targetId: z.string(), // resumeId or jobId depending on `type`
  status: z.enum(["QUEUED", "RUNNING", "COMPLETED", "FAILED"]),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ProcessingJob = z.infer<typeof processingJobSchema>;
