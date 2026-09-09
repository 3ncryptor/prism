import type { StudentProfile } from "@/lib/schemas/studentProfile";
import type { MatchEvidence, RetrievalMap } from "@/lib/matching/types";

export interface ConfidenceInputs {
  studentProfile: StudentProfile;
  evidence: MatchEvidence[];
  retrieval: RetrievalMap;
}

const WEIGHTS = {
  extractionQuality: 0.2,
  evidenceCoverage: 0.3,
  matchingClarity: 0.25,
  informationCompleteness: 0.15,
  deterministicCoverage: 0.1,
};

/**
 * buildPlan.md §34-36 / BACKEND_ARCHITECTURE.md §6.10. Confidence != score
 * — it measures how reliable the score estimate is, not how good the fit
 * is. All five inputs computed from data already available on the
 * profile/assembled evidence (no separate persisted "text quality" or
 * "needs_review" field exists on StudentProfile today — extractionQuality
 * is approximated from whether the profile has substantive content at
 * all, which is the closest available signal; wiring in the resume
 * pipeline's own transient text-quality check would need a schema
 * addition out of scope for this feature).
 */
export function computeConfidence(inputs: ConfidenceInputs): number {
  const { studentProfile, evidence, retrieval } = inputs;

  const hasSubstantiveContent =
    studentProfile.skills.length > 0 || studentProfile.projects.length > 0 || studentProfile.experience.length > 0;
  const extractionQuality = hasSubstantiveContent ? 100 : 0;

  const scoredEvidence = evidence.filter((e) => e.score > 0);
  const evidenceCoverage =
    evidence.length > 0
      ? (evidence.filter((e) => e.matchedEvidence !== undefined).length / evidence.length) * 100
      : 100;

  const margins = Array.from(retrieval.values())
    .filter((r) => r.score > 0)
    .map((r) => Math.max(0, r.score - r.secondBestScore));
  const matchingClarity = margins.length > 0 ? (margins.reduce((a, b) => a + b, 0) / margins.length) * 100 : 100;

  const sections = [
    studentProfile.skills.length > 0,
    studentProfile.projects.length > 0,
    studentProfile.experience.length > 0,
    studentProfile.education.length > 0,
  ];
  const informationCompleteness = (sections.filter(Boolean).length / sections.length) * 100;

  const deterministicCoverage =
    scoredEvidence.length > 0
      ? (scoredEvidence.filter((e) => e.score === 1).length / scoredEvidence.length) * 100
      : 100;

  return (
    extractionQuality * WEIGHTS.extractionQuality +
    evidenceCoverage * WEIGHTS.evidenceCoverage +
    matchingClarity * WEIGHTS.matchingClarity +
    informationCompleteness * WEIGHTS.informationCompleteness +
    deterministicCoverage * WEIGHTS.deterministicCoverage
  );
}
