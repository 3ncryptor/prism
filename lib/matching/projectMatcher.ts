import type { JobProfile } from "@/lib/schemas/jobProfile";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import type { MatchEvidence, RetrievalMap } from "@/lib/matching/types";
import { retrievalKey } from "@/lib/matching/types";

export interface ProjectMatchResult {
  categoryScore: number;
  evidence: MatchEvidence[];
}

/**
 * buildPlan.md §29: for each JD responsibility, use the pre-fetched
 * best-matching student project/experience evidence and score against
 * configured semantic thresholds.
 */
export function matchProjects(job: JobProfile, retrieval: RetrievalMap, config: ScoringConfig): ProjectMatchResult {
  if (job.responsibilities.length === 0) {
    return { categoryScore: 100, evidence: [] };
  }

  const evidence: MatchEvidence[] = [];
  let total = 0;

  job.responsibilities.forEach((responsibility, index) => {
    const retrieved = retrieval.get(retrievalKey("RESPONSIBILITY", `${index}`));
    let score = 0;
    let reason = "No matching project found";

    if (retrieved && retrieved.score >= config.semanticThresholds.strong) {
      score = retrieved.score;
      reason = "Strong project match";
    } else if (retrieved && retrieved.score >= config.semanticThresholds.possible) {
      score = retrieved.score;
      reason = "Possible project match";
    }

    total += score;
    evidence.push({
      category: "PROJECT",
      requirement: responsibility,
      matchedEvidence: retrieved?.text,
      sourceType: retrieved?.featureType === "EXPERIENCE" ? "EXPERIENCE" : retrieved ? "PROJECT" : undefined,
      score,
      reason,
    });
  });

  return { categoryScore: (total / job.responsibilities.length) * 100, evidence };
}
