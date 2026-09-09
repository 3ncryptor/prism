/** buildPlan.md §58 */
export type DocumentProcessingJobPayload =
  | { type: "RESUME_PROCESS"; resumeId: string }
  | { type: "JD_PROCESS"; jobId: string };
