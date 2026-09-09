import { z } from "zod";
import {
  studentProfileSchema,
  skillSchema,
  projectSchema,
  experienceSchema,
  educationSchema,
  certificationSchema,
  achievementSchema,
  type StudentProfile,
} from "@/lib/schemas/studentProfile";
import { verifyEvidence } from "@/lib/extraction/evidenceVerifier";
import { canonicalizeSkillName } from "@/lib/services/skillTaxonomyService";
import type { SkillTaxonomyEntry } from "@/lib/schemas/skillTaxonomy";

export class InvalidExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidExtractionError";
  }
}

const rawExtractionSchema = z.object({
  skills: z.array(skillSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  projects: z.array(projectSchema).default([]),
  education: z.array(educationSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  achievements: z.array(achievementSchema).default([]),
  coursework: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
});

/**
 * buildPlan.md §20 Rule 3: a claim with no verifiable evidence is
 * discarded (not silently trusted). Applies to the four categories that
 * carry an `evidence: string[]` field.
 */
function keepVerifiedClaims<T extends { evidence: string[] }>(
  claims: T[],
  sourceText: string,
): T[] {
  return claims.filter((claim) =>
    claim.evidence.some((snippet) => verifyEvidence(snippet, sourceText).verified),
  );
}

export interface NormalizeContext {
  studentId: string;
  resumeId: string;
  sourceText: string;
  model: string;
  promptVersion: string;
  skillTaxonomy: SkillTaxonomyEntry[];
}

/** buildPlan.md §15: Zod validation -> normalization -> profile validation. */
export function normalizeProfile(raw: unknown, context: NormalizeContext): StudentProfile {
  const parsed = rawExtractionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new InvalidExtractionError(
      `LLM output failed schema validation: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }

  const data = parsed.data;
  const skills = keepVerifiedClaims(data.skills, context.sourceText);
  const education = keepVerifiedClaims(data.education, context.sourceText);
  const certifications = keepVerifiedClaims(data.certifications, context.sourceText);
  const achievements = keepVerifiedClaims(data.achievements, context.sourceText);

  const canonicalizedSkills = skills.map((skill) => ({
    ...skill,
    canonicalName: canonicalizeSkillName(skill.canonicalName, context.skillTaxonomy),
  }));

  const totalExperienceMonths = data.experience.reduce(
    (sum, exp) => sum + (exp.months ?? 0),
    0,
  );

  const now = new Date();
  const profile: Omit<StudentProfile, "_id"> = {
    studentId: context.studentId,
    resumeId: context.resumeId,
    isActive: true,
    education,
    skills: canonicalizedSkills,
    experience: data.experience,
    projects: data.projects,
    certifications,
    achievements,
    coursework: data.coursework,
    languages: data.languages,
    totalExperienceMonths,
    profileVersion: 1,
    extractionMetadata: {
      model: context.model,
      promptVersion: context.promptVersion,
      extractedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };

  const validated = studentProfileSchema.omit({ _id: true }).safeParse(profile);
  if (!validated.success) {
    throw new InvalidExtractionError(
      `Normalized profile failed validation: ${validated.error.issues.map((i) => i.message).join("; ")}`,
    );
  }

  return validated.data as StudentProfile;
}
