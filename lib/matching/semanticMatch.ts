import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import type { RetrievedEvidence } from "@/lib/services/vectorStoreService";

export interface SemanticMatchResult {
  score: number;
  reason: string;
  matchedEvidenceText: string | undefined;
}

const WEAK_MATCH_CREDIT_FACTOR = 0.5;

/**
 * Shared by skillMatcher/projectMatcher/requirementMatcher: converts one
 * retrieved evidence match (or its absence) into a score + a
 * human-readable reason, using the scoring config's three-tier semantic
 * thresholds.
 *
 * Below `possible`, a real (if modest) cosine similarity is genuine
 * information, not noise — confirmed live: a candidate's actual project
 * ("built a Node.js backend with payment integration") retrieved as
 * evidence against a JD responsibility describing the same kind of work,
 * yet scored a flat 0 because the previous design zeroed out anything
 * below `possible`. That 0/1 cliff meant "almost a match" and "no
 * evidence at all" were scored identically. `weak` gives that evidence
 * half credit instead of none. Below `weak` is still treated as noise —
 * embedding spaces have a nonzero baseline similarity between nearly
 * anything, so a floor is still needed to avoid awarding credit for
 * genuinely unrelated content.
 */
export function scoreSemanticMatch(
  retrieved: RetrievedEvidence | undefined,
  thresholds: ScoringConfig["semanticThresholds"],
): SemanticMatchResult {
  if (!retrieved) {
    return { score: 0, reason: "No match found", matchedEvidenceText: undefined };
  }

  if (retrieved.score >= thresholds.strong) {
    return { score: retrieved.score, reason: "Strong semantic match", matchedEvidenceText: retrieved.text };
  }
  if (retrieved.score >= thresholds.possible) {
    return { score: retrieved.score, reason: "Possible semantic match", matchedEvidenceText: retrieved.text };
  }
  if (retrieved.score >= thresholds.weak) {
    return {
      score: retrieved.score * WEAK_MATCH_CREDIT_FACTOR,
      reason: "Weak semantic match",
      matchedEvidenceText: retrieved.text,
    };
  }
  return { score: 0, reason: "No match found", matchedEvidenceText: undefined };
}
