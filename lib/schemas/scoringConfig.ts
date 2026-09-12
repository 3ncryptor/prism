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
    /**
     * A third, lower tier below `possible`: real cosine similarity, not
     * noise, but not strong enough for full credit. Confirmed live
     * (2026-09): a candidate with a clearly relevant backend project
     * ("built a Node.js backend with payment integration") scored a flat
     * 0 against a JD responsibility describing the same work, because
     * the retrieval fell just short of `possible` — the previous 0/1
     * cliff at `possible` treated "almost a match" identically to "no
     * evidence at all". Below `weak` is still treated as noise (embedding
     * spaces have a nonzero baseline similarity between nearly anything).
     */
    weak: z.number(),
  }),
  mandatoryPenalty: z.number(),
  createdBy: z.string(),
  createdAt: z.date(),
});
export type ScoringConfig = z.infer<typeof scoringConfigSchema>;
