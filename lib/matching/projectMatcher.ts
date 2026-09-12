import type { JobProfile } from "@/lib/schemas/jobProfile";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import type { MatchEvidence, RetrievalMap } from "@/lib/matching/types";
import { retrievalKey } from "@/lib/matching/types";
import { scoreSemanticMatch } from "@/lib/matching/semanticMatch";

export interface ProjectMatchResult {
  categoryScore: number;
  evidence: MatchEvidence[];
}

/**
 * buildPlan.md §29: for each JD responsibility, use the pre-fetched
 * best-matching student project/experience evidence and score against
 * configured semantic thresholds (scoreSemanticMatch — see its own
 * comment for why a below-`possible` retrieval still earns partial
 * credit instead of a flat 0).
 */
export function matchProjects(job: JobProfile, retrieval: RetrievalMap, config: ScoringConfig): ProjectMatchResult {
  if (job.responsibilities.length === 0) {
    return { categoryScore: 100, evidence: [] };
  }

  const evidence: MatchEvidence[] = [];
  let total = 0;

  job.responsibilities.forEach((responsibility, index) => {
    const retrieved = retrieval.get(retrievalKey("RESPONSIBILITY", `${index}`));
    const { score, reason, matchedEvidenceText } = scoreSemanticMatch(retrieved, config.semanticThresholds);

    total += score;
    evidence.push({
      category: "PROJECT",
      requirement: responsibility,
      matchedEvidence: matchedEvidenceText,
      sourceType: matchedEvidenceText ? (retrieved?.featureType === "EXPERIENCE" ? "EXPERIENCE" : "PROJECT") : undefined,
      score,
      reason,
    });
  });

  return { categoryScore: (total / job.responsibilities.length) * 100, evidence };
}
