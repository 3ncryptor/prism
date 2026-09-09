import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import type { FitBucket } from "@/lib/matching/types";

/**
 * buildPlan.md §33: deterministic thresholds, applied even when
 * eligible: false (BACKEND_ARCHITECTURE.md §0.3 — ineligible students are
 * still bucketed for transparency, not silently dropped).
 */
export function bucketScore(score: number, config: ScoringConfig): FitBucket {
  if (score >= config.buckets.bestFit) return "BEST_FIT";
  if (score >= config.buckets.moderateFit) return "MODERATE_FIT";
  return "LOW_FIT";
}
