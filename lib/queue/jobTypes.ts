/** buildPlan.md §58 */
export type DocumentProcessingJobPayload =
  | { type: "RESUME_PROCESS"; resumeId: string }
  | { type: "JD_PROCESS"; jobId: string };

/** buildPlan.md §58/§45. */
export type MatchingJobPayload = { type: "MATCH_JOB"; matchRunId: string };
