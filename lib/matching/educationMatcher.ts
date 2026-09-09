import type { Education } from "@/lib/schemas/studentProfile";
import type { EducationRequirement } from "@/lib/schemas/jobProfile";
import type { MatchEvidence } from "@/lib/matching/types";
import { isDegreeEquivalent, isFieldEquivalent } from "@/lib/config/degreeEquivalence";

export interface EducationMatchResult {
  categoryScore: number;
  evidence: MatchEvidence[];
}

/** BACKEND_ARCHITECTURE.md §0.5: degree AND field (if set) AND cgpa (if set). */
export function satisfiesEducationRequirement(edu: Education, requirement: EducationRequirement): boolean {
  const degreeMatches = requirement.degree.some((d) => isDegreeEquivalent(edu.degree, d));
  if (!degreeMatches) return false;

  if (requirement.field && requirement.field.length > 0) {
    const fieldMatches = requirement.field.some((f) => isFieldEquivalent(edu.field, f));
    if (!fieldMatches) return false;
  }

  if (requirement.minCgpa !== undefined) {
    if (edu.cgpa === undefined || edu.cgpa < requirement.minCgpa) return false;
  }

  return true;
}

/** buildPlan.md §30: deterministic degree/field/CGPA match. */
export function matchEducation(
  requirements: EducationRequirement[] | undefined,
  studentEducation: Education[],
): EducationMatchResult {
  if (!requirements || requirements.length === 0) {
    return { categoryScore: 100, evidence: [] };
  }

  const evidence: MatchEvidence[] = [];
  let satisfiedCount = 0;

  for (const requirement of requirements) {
    const matchedEducation = studentEducation.find((edu) => satisfiesEducationRequirement(edu, requirement));
    const score = matchedEducation ? 1.0 : 0;
    if (matchedEducation) satisfiedCount += 1;

    evidence.push({
      category: "EDUCATION",
      requirement: `${requirement.degree.join("/")}${requirement.field ? ` in ${requirement.field.join("/")}` : ""}`,
      matchedEvidence: matchedEducation ? `${matchedEducation.degree}, ${matchedEducation.field}` : undefined,
      sourceType: "RESUME",
      score,
      reason: matchedEducation ? "Degree/field/CGPA match" : "No matching education entry",
    });
  }

  return { categoryScore: (satisfiedCount / requirements.length) * 100, evidence };
}
