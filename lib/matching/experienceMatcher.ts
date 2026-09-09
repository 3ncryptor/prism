import type { Experience } from "@/lib/schemas/studentProfile";
import type { ExperienceRequirement } from "@/lib/schemas/jobProfile";
import type { MatchEvidence } from "@/lib/matching/types";

export interface ExperienceMatchResult {
  categoryScore: number;
  evidence: MatchEvidence[];
  relevantMonths: number;
}

/**
 * buildPlan.md §28's domain relevance ("interpret according to requirement
 * semantics") implemented as a deterministic keyword/token-overlap check
 * against each experience entry's role/description/technologies —  not a
 * vector search. A dedicated embedding feature for free-text "domain"
 * strings would expand the embedded feature set for a single, cheaply
 * heuristic check; this is a documented V1 simplification, tunable later.
 */
function isDomainRelevant(experience: Experience, domain: string): boolean {
  const domainTokens = domain.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [
    experience.role,
    experience.description,
    ...experience.technologies,
    ...experience.responsibilities,
  ]
    .join(" ")
    .toLowerCase();
  return domainTokens.some((token) => haystack.includes(token));
}

/** Shared with eligibilityEngine.ts so both use the same relevance definition. */
export function computeRelevantExperienceMonths(experience: Experience[], domain?: string): number {
  return experience
    .filter((exp) => !domain || isDomainRelevant(exp, domain))
    .reduce((sum, exp) => sum + (exp.months ?? 0), 0);
}

/** buildPlan.md §28: ratio of relevant months to required, capped at 1.0. */
export function matchExperience(
  requirement: ExperienceRequirement | undefined,
  studentExperience: Experience[],
): ExperienceMatchResult {
  if (!requirement) {
    return { categoryScore: 100, evidence: [], relevantMonths: 0 };
  }

  const relevantMonths = computeRelevantExperienceMonths(studentExperience, requirement.domain);
  const ratio = requirement.minMonths > 0 ? Math.min(1, relevantMonths / requirement.minMonths) : 1;

  return {
    categoryScore: ratio * 100,
    relevantMonths,
    evidence: [
      {
        category: "EXPERIENCE",
        requirement: requirement.domain
          ? `${requirement.minMonths} months in ${requirement.domain}`
          : `${requirement.minMonths} months experience`,
        matchedEvidence: relevantMonths > 0 ? `${relevantMonths} relevant months found` : undefined,
        sourceType: "EXPERIENCE",
        score: ratio,
        reason: `${relevantMonths}/${requirement.minMonths} months`,
      },
    ],
  };
}
