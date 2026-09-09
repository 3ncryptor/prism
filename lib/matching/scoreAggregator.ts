import type { StudentProfile } from "@/lib/schemas/studentProfile";
import type { JobProfile } from "@/lib/schemas/jobProfile";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import type { CategoryScores, MatchEvidence } from "@/lib/matching/types";
import { checkConstraint } from "@/lib/matching/eligibilityEngine";

export interface HardRequirementResult {
  categoryScore: number;
  evidence: MatchEvidence[];
}

/**
 * BACKEND_ARCHITECTURE.md §0.1: the Hard Requirements *category score*
 * (25% weighted) is scored from non-disqualifying ("soft") constraints
 * only — disqualifying ones are eligibilityEngine's job, not this
 * category's. Defaults to 100 when there are no soft constraints (nothing
 * to penalize), not 0.
 */
export function scoreHardRequirements(student: StudentProfile, job: JobProfile): HardRequirementResult {
  const softConstraints = job.constraints.filter((c) => !c.disqualifying);
  if (softConstraints.length === 0) {
    return { categoryScore: 100, evidence: [] };
  }

  const evidence: MatchEvidence[] = softConstraints.map((constraint) => {
    const passed = checkConstraint(constraint, student);
    return {
      category: "REQUIREMENT" as const,
      requirement: constraint.name,
      score: passed ? 1 : 0,
      reason: passed ? "Soft constraint satisfied" : "Soft constraint not satisfied",
    };
  });

  const satisfiedCount = evidence.filter((e) => e.score === 1).length;
  return { categoryScore: (satisfiedCount / evidence.length) * 100, evidence };
}

/** buildPlan.md §31/§6.7: weighted sum of the six category scores. */
export function aggregateScore(categoryScores: CategoryScores, config: ScoringConfig): number {
  return (
    categoryScores.hardRequirements * config.weights.hardRequirements +
    categoryScores.skills * config.weights.skills +
    categoryScores.experience * config.weights.experience +
    categoryScores.projects * config.weights.projects +
    categoryScores.education * config.weights.education +
    categoryScores.other * config.weights.other
  );
}
