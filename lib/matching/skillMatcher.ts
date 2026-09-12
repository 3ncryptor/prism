import type { Skill } from "@/lib/schemas/studentProfile";
import type { Requirement } from "@/lib/schemas/jobProfile";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import type { MatchEvidence, RetrievalMap } from "@/lib/matching/types";
import { retrievalKey } from "@/lib/matching/types";
import { scoreSemanticMatch } from "@/lib/matching/semanticMatch";

/** buildPlan.md §27's weighted-mean-by-importance rule. */
const IMPORTANCE_WEIGHT: Record<Requirement["importance"], number> = {
  MANDATORY: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export interface SkillMatchResult {
  categoryScore: number;
  evidence: MatchEvidence[];
  missingRequirements: string[];
  /** How many MANDATORY requirements scored a true 0 (no evidence at all,
   * not even a weak semantic match) vs. how many MANDATORY requirements
   * existed — feeds penaltyEngine's proportional penalty. */
  mandatoryMissedCount: number;
  mandatoryTotal: number;
}

/** buildPlan.md §25: layers 1-2 (exact canonical + alias) are the same check once skills are canonicalized. */
function findExactOrAliasMatch(requirement: Requirement, studentSkills: Skill[]): Skill | undefined {
  return studentSkills.find((skill) => skill.canonicalName === requirement.canonicalName);
}

/** buildPlan.md §25/§27: exact/alias -> 1.0; else semantic layer against thresholds. */
export function matchSkills(
  requirements: Requirement[],
  studentSkills: Skill[],
  retrieval: RetrievalMap,
  config: ScoringConfig,
): SkillMatchResult {
  if (requirements.length === 0) {
    return { categoryScore: 100, evidence: [], missingRequirements: [], mandatoryMissedCount: 0, mandatoryTotal: 0 };
  }

  const evidence: MatchEvidence[] = [];
  const missingRequirements: string[] = [];
  let mandatoryMissedCount = 0;
  let mandatoryTotal = 0;
  let weightedSum = 0;
  let weightTotal = 0;

  for (const requirement of requirements) {
    const weight = IMPORTANCE_WEIGHT[requirement.importance];
    weightTotal += weight;
    if (requirement.importance === "MANDATORY") mandatoryTotal += 1;

    const exactMatch = findExactOrAliasMatch(requirement, studentSkills);
    let score: number;
    let reason: string;
    let matchedEvidenceText: string | undefined;

    if (exactMatch) {
      score = 1.0;
      reason = "Canonical skill match";
      matchedEvidenceText = exactMatch.evidence[0];
    } else {
      const retrieved = retrieval.get(retrievalKey("SKILL", requirement.canonicalName));
      ({ score, reason, matchedEvidenceText } = scoreSemanticMatch(retrieved, config.semanticThresholds));
    }

    weightedSum += score * weight;
    evidence.push({
      category: "SKILL",
      requirement: requirement.name,
      matchedEvidence: matchedEvidenceText,
      sourceType: matchedEvidenceText ? "RESUME" : undefined,
      score,
      reason,
    });

    // "below possible with importance >= MEDIUM" (§6.2 point 6) = not LOW.
    if (score < config.semanticThresholds.possible && requirement.importance !== "LOW") {
      missingRequirements.push(requirement.name);
    }
    if (score === 0 && requirement.importance === "MANDATORY") {
      mandatoryMissedCount += 1;
    }
  }

  const categoryScore = weightTotal > 0 ? (weightedSum / weightTotal) * 100 : 100;
  return { categoryScore, evidence, missingRequirements, mandatoryMissedCount, mandatoryTotal };
}
