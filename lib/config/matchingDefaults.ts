import type { ScoringConfig } from "@/lib/schemas/scoringConfig";

/**
 * buildPlan.md §31/§32/§33/§27's own example starting values — explicitly
 * flagged there as calibration placeholders ("must be calibrated against
 * evaluation data"), not tuned business logic. Seeded once as scoring-v1;
 * later versions are created via ScoringConfigService, never by editing
 * this file's values in place.
 */
export const SCORING_V1_DEFAULTS: Omit<ScoringConfig, "_id" | "isActive" | "createdAt" | "createdBy"> = {
  version: "scoring-v1",
  weights: {
    hardRequirements: 0.25,
    skills: 0.3,
    experience: 0.15,
    projects: 0.15,
    education: 0.1,
    other: 0.05,
  },
  buckets: {
    bestFit: 80,
    moderateFit: 60,
  },
  semanticThresholds: {
    strong: 0.85,
    possible: 0.75,
  },
  mandatoryPenalty: 0.75,
};
