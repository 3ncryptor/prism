import type { StudentProfile } from "@/lib/schemas/studentProfile";
import type { JobProfile } from "@/lib/schemas/jobProfile";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import type { MatchEvidence, RetrievalMap } from "@/lib/matching/types";
import { retrievalKey } from "@/lib/matching/types";
import { scoreSemanticMatch } from "@/lib/matching/semanticMatch";

export interface RequirementMatchResult {
  categoryScore: number;
  evidence: MatchEvidence[];
}

const IMPORTANCE_WEIGHT = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;

/**
 * BACKEND_ARCHITECTURE.md §6.6: certifications/achievements/coursework
 * matched against SemanticRequirements not already covered by skill/
 * project matching — feeds the "Other Evidence" 5% category (buildPlan §31).
 */
export function matchOtherRequirements(
  student: StudentProfile,
  job: JobProfile,
  retrieval: RetrievalMap,
  config: ScoringConfig,
): RequirementMatchResult {
  if (job.semanticRequirements.length === 0) {
    return { categoryScore: 100, evidence: [] };
  }

  const evidence: MatchEvidence[] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  const directMatchCandidates = [
    ...student.certifications.map((c) => c.name),
    ...student.achievements.map((a) => a.title),
    ...student.coursework,
  ];

  job.semanticRequirements.forEach((requirement, index) => {
    const weight = IMPORTANCE_WEIGHT[requirement.importance];
    weightTotal += weight;

    const description = requirement.description.toLowerCase();
    const directMatch = directMatchCandidates.find(
      (text) => description.includes(text.toLowerCase()) || text.toLowerCase().includes(description),
    );

    let score: number;
    let reason: string;
    let matchedEvidenceText: string | undefined;

    if (directMatch) {
      score = 1.0;
      reason = "Direct certification/achievement/coursework match";
      matchedEvidenceText = directMatch;
    } else {
      const retrieved = retrieval.get(retrievalKey("SEMANTIC_REQUIREMENT", `${index}`));
      ({ score, reason, matchedEvidenceText } = scoreSemanticMatch(retrieved, config.semanticThresholds));
    }

    weightedSum += score * weight;
    evidence.push({
      category: "REQUIREMENT",
      requirement: requirement.description,
      matchedEvidence: matchedEvidenceText,
      sourceType: "RESUME",
      score,
      reason,
    });
  });

  const categoryScore = weightTotal > 0 ? (weightedSum / weightTotal) * 100 : 100;
  return { categoryScore, evidence };
}
