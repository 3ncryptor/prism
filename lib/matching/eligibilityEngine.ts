import type { StudentProfile } from "@/lib/schemas/studentProfile";
import type { JobConstraint, JobProfile } from "@/lib/schemas/jobProfile";
import { computeRelevantExperienceMonths } from "@/lib/matching/experienceMatcher";
import { satisfiesEducationRequirement } from "@/lib/matching/educationMatcher";
import { isDegreeEquivalent } from "@/lib/config/degreeEquivalence";

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

/**
 * Shared with scoreAggregator.ts (soft/non-disqualifying constraints use
 * the same check, just scored instead of gating).
 */
export function checkConstraint(constraint: JobConstraint, student: StudentProfile): boolean {
  switch (constraint.type) {
    case "GRADUATION_YEAR":
      return student.education.some((edu) => edu.endYear === Number(constraint.value));
    case "CGPA":
      return student.education.some((edu) => edu.cgpa !== undefined && edu.cgpa >= Number(constraint.value));
    case "DEGREE":
      return student.education.some((edu) => isDegreeEquivalent(edu.degree, String(constraint.value)));
    case "CERTIFICATION":
      return student.certifications.some((cert) =>
        cert.name.toLowerCase().includes(String(constraint.value).toLowerCase()),
      );
    case "OTHER":
      // Cannot be deterministically verified — never auto-disqualifies or
      // auto-passes; scoreAggregator treats it as satisfied-by-default for
      // scoring purposes, and it's simply skipped here (never disqualifying).
      return true;
    default:
      return true;
  }
}

/**
 * buildPlan.md §24 / BACKEND_ARCHITECTURE.md §0.1/§6.1: only
 * `disqualifying: true` entries gate eligibility. Continues evaluating all
 * checks regardless of an earlier failure (§0.3 — no short-circuiting, so
 * every reason is captured).
 */
export function evaluateEligibility(student: StudentProfile, job: JobProfile): EligibilityResult {
  const reasons: string[] = [];

  for (const constraint of job.constraints) {
    if (!constraint.disqualifying) continue;
    if (!checkConstraint(constraint, student)) {
      reasons.push(`Failed constraint: ${constraint.name}`);
    }
  }

  for (const requirement of job.educationRequirements ?? []) {
    if (!requirement.disqualifying) continue;
    const satisfied = student.education.some((edu) => satisfiesEducationRequirement(edu, requirement));
    if (!satisfied) {
      reasons.push(`Failed mandatory education requirement: ${requirement.degree.join("/")}`);
    }
  }

  if (job.requiredExperience?.disqualifying) {
    const relevantMonths = computeRelevantExperienceMonths(student.experience, job.requiredExperience.domain);
    if (relevantMonths < job.requiredExperience.minMonths) {
      reasons.push(`Failed mandatory experience requirement: ${job.requiredExperience.minMonths} months`);
    }
  }

  return { eligible: reasons.length === 0, reasons };
}
