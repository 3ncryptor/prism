import { z } from "zod";

/** buildPlan.md §113.3. Immutable once referenced by any matchRun (§46). */
export const scoringConfigSchema = z.object({
  _id: z.string(),
  version: z.string(),
  isActive: z.boolean(),
  weights: z.object({
    hardRequirements: z.number(),
    skills: z.number(),
    experience: z.number(),
    projects: z.number(),
    education: z.number(),
    other: z.number(),
  }),
  buckets: z.object({
    bestFit: z.number(),
    moderateFit: z.number(),
  }),
  semanticThresholds: z.object({
    strong: z.number(),
    possible: z.number(),
  }),
  mandatoryPenalty: z.number(),
  createdBy: z.string(),
  createdAt: z.date(),
});
export type ScoringConfig = z.infer<typeof scoringConfigSchema>;
