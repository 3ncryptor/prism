import type { ScoringConfigRepository } from "@/lib/db/repositories/scoringConfigRepository";
import { SCORING_V1_DEFAULTS } from "@/lib/config/matchingDefaults";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";

/**
 * Idempotent (buildPlan.md §56): if scoring-v1 already exists, leaves it
 * untouched (ScoringConfig is immutable once a matchRun could reference
 * it, per §46) rather than re-creating or re-activating it.
 */
export async function seedScoringConfig(
  scoringConfigs: Pick<ScoringConfigRepository, "getByVersion" | "create" | "activate">,
  createdBy: string,
): Promise<ScoringConfig> {
  const existing = await scoringConfigs.getByVersion(SCORING_V1_DEFAULTS.version);
  if (existing) return existing;

  const created = await scoringConfigs.create({ ...SCORING_V1_DEFAULTS, createdBy });
  await scoringConfigs.activate(created._id);
  return { ...created, isActive: true };
}
