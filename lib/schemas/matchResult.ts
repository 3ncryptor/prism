import { z } from "zod";

/** buildPlan.md §37. */
export const matchEvidenceSchema = z.object({
  category: z.enum(["SKILL", "EXPERIENCE", "PROJECT", "EDUCATION", "REQUIREMENT"]),
  requirement: z.string(),
  matchedEvidence: z.string().optional(),
  sourceType: z.enum(["RESUME", "PROJECT", "EXPERIENCE"]).optional(),
  score: z.number(),
  reason: z.string(),
});
export type MatchEvidenceDoc = z.infer<typeof matchEvidenceSchema>;

/** buildPlan.md §38 + BACKEND_ARCHITECTURE.md §0.3's `eligible` field. */
export const matchResultSchema = z.object({
  _id: z.string(),
  matchRunId: z.string(),
  studentId: z.string(),
  jobId: z.string(),
  // docs/screens.md §4.10 (feature 27e): "Resume used" — which of the
  // student's (potentially several, role-tagged) resumes selectResumeForJob
  // picked for this specific job, so admin CV review opens the right file.
  resumeId: z.string(),
  score: z.number(),
  bucket: z.enum(["BEST_FIT", "MODERATE_FIT", "LOW_FIT"]),
  confidence: z.number(),
  eligible: z.boolean(),
  ineligibilityReasons: z.array(z.string()),
  categoryScores: z.object({
    hardRequirements: z.number(),
    skills: z.number(),
    experience: z.number(),
    projects: z.number(),
    education: z.number(),
    other: z.number(),
  }),
  evidence: z.array(matchEvidenceSchema),
  missingRequirements: z.array(z.string()),
  scoringConfigVersion: z.string(),
  modelVersions: z.object({
    extraction: z.string(),
    embedding: z.string(),
  }),
  createdAt: z.date(),
});
export type MatchResult = z.infer<typeof matchResultSchema>;
