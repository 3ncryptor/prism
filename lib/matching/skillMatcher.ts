import type { Skill } from "@/lib/schemas/studentProfile";
import type { Requirement } from "@/lib/schemas/jobProfile";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import type { MatchEvidence, RetrievalMap } from "@/lib/matching/types";
import { retrievalKey } from "@/lib/matching/types";

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
  /** A true miss (score 0), not merely low-semantic — feeds the penalty engine (§0.2). */
  mandatoryMissed: boolean;
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
    return { categoryScore: 100, evidence: [], missingRequirements: [], mandatoryMissed: false };
  }

  const evidence: MatchEvidence[] = [];
  const missingRequirements: string[] = [];
  let mandatoryMissed = false;
  let weightedSum = 0;
  let weightTotal = 0;

  for (const requirement of requirements) {
    const weight = IMPORTANCE_WEIGHT[requirement.importance];
    weightTotal += weight;

    const exactMatch = findExactOrAliasMatch(requirement, studentSkills);
    let score = 0;
    let reason = "No match found";
    let matchedEvidenceText: string | undefined;

    if (exactMatch) {
      score = 1.0;
      reason = "Canonical skill match";
      matchedEvidenceText = exactMatch.evidence[0];
    } else {
      const retrieved = retrieval.get(retrievalKey("SKILL", requirement.canonicalName));
      if (retrieved && retrieved.score >= config.semanticThresholds.strong) {
        score = retrieved.score;
        reason = "Strong semantic match";
        matchedEvidenceText = retrieved.text;
      } else if (retrieved && retrieved.score >= config.semanticThresholds.possible) {
        score = retrieved.score;
        reason = "Possible semantic match";
        matchedEvidenceText = retrieved.text;
      }
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
      mandatoryMissed = true;
    }
  }

  const categoryScore = weightTotal > 0 ? (weightedSum / weightTotal) * 100 : 100;
  return { categoryScore, evidence, missingRequirements, mandatoryMissed };
}
