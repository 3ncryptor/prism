import { z } from "zod";
import {
  jobProfileSchema,
  requirementSchema,
  jobConstraintSchema,
  educationRequirementSchema,
  experienceRequirementSchema,
  semanticRequirementSchema,
  type JobProfile,
} from "@/lib/schemas/jobProfile";
import { nullish } from "@/lib/schemas/zodHelpers";
import { InvalidExtractionError } from "@/lib/extraction/normalizeProfile";

const rawJobExtractionSchema = z.object({
  title: z.string(),
  company: nullish(z.string()),
  requiredSkills: z.array(requirementSchema).default([]),
  preferredSkills: z.array(requirementSchema).default([]),
  responsibilities: z.array(z.string()).default([]),
  requiredExperience: nullish(experienceRequirementSchema),
  educationRequirements: z.array(educationRequirementSchema).default([]),
  certifications: z.array(z.string()).default([]),
  preferredDomains: z.array(z.string()).default([]),
  constraints: z.array(jobConstraintSchema).default([]),
  semanticRequirements: z.array(semanticRequirementSchema).default([]),
});

export interface NormalizeJobContext {
  jobId: string;
}

/**
 * buildPlan.md §21: raw LLM JSON -> Zod-validated -> JobProfile.
 * No evidence-verification filtering here (unlike normalizeProfile for
 * resumes, feature #8) — the JD is the admin's own source-of-truth
 * document, not a claim needing grounding against itself. See
 * docs/agent-artifacts/09-13-student-and-jd-pipeline/spec.md.
 */
export function normalizeJobProfile(raw: unknown, context: NormalizeJobContext): JobProfile {
  const parsed = rawJobExtractionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new InvalidExtractionError(
      `LLM output failed schema validation: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }

  const data = parsed.data;
  const now = new Date();
  const profile: Omit<JobProfile, "_id"> = {
    jobId: context.jobId,
    title: data.title,
    company: data.company,
    requiredSkills: data.requiredSkills,
    preferredSkills: data.preferredSkills,
    responsibilities: data.responsibilities,
    requiredExperience: data.requiredExperience,
    educationRequirements: data.educationRequirements,
    certifications: data.certifications,
    preferredDomains: data.preferredDomains,
    constraints: data.constraints,
    semanticRequirements: data.semanticRequirements,
    profileVersion: 1,
    createdAt: now,
    updatedAt: now,
  };

  const validated = jobProfileSchema.omit({ _id: true }).safeParse(profile);
  if (!validated.success) {
    throw new InvalidExtractionError(
      `Normalized job profile failed validation: ${validated.error.issues.map((i) => i.message).join("; ")}`,
    );
  }

  return validated.data as JobProfile;
}
