import type { RetrievedEvidence } from "@/lib/services/vectorStoreService";

/** buildPlan.md §33. */
export type FitBucket = "BEST_FIT" | "MODERATE_FIT" | "LOW_FIT";

/** buildPlan.md §37. */
export interface MatchEvidence {
  category: "SKILL" | "EXPERIENCE" | "PROJECT" | "EDUCATION" | "REQUIREMENT";
  requirement: string;
  matchedEvidence?: string;
  sourceType?: "RESUME" | "PROJECT" | "EXPERIENCE";
  score: number;
  reason: string;
}

/** buildPlan.md §31/§38. */
export interface CategoryScores {
  hardRequirements: number;
  skills: number;
  experience: number;
  projects: number;
  education: number;
  other: number;
}

/**
 * buildPlan.md §63 + BACKEND_ARCHITECTURE.md §0.3 (adds `eligible` and
 * `ineligibilityReasons` — ineligible students are still scored, not
 * skipped, so an admin can see how close a disqualified student was).
 */
export interface MatchEvaluation {
  score: number;
  confidence: number;
  bucket: FitBucket;
  eligible: boolean;
  ineligibilityReasons: string[];
  categoryScores: CategoryScores;
  evidence: MatchEvidence[];
  missingRequirements: string[];
}

/**
 * Keyed the same way as embeddingService's job feature IDs
 * (`${featureType}:${featureId}`) so matchers can look up pre-fetched
 * semantic evidence for a given requirement without doing I/O themselves
 * (BACKEND_ARCHITECTURE.md §2: lib/matching/* has no I/O).
 */
export type RetrievalMap = Map<string, RetrievedEvidence>;

export function retrievalKey(featureType: string, featureId: string): string {
  return `${featureType}:${featureId}`;
}
