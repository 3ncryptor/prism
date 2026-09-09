import { z } from "zod";
import { nullish } from "@/lib/schemas/zodHelpers";

export const requirementSchema = z.object({
  name: z.string(),
  canonicalName: z.string(),
  category: z.string(),
  importance: z.enum(["MANDATORY", "HIGH", "MEDIUM", "LOW"]),
  evidence: nullish(z.string()),
  yearsRequired: nullish(z.number()),
});
export type Requirement = z.infer<typeof requirementSchema>;

// buildPlan.md §113.1
export const jobConstraintSchema = z.object({
  name: z.string(),
  type: z.enum(["GRADUATION_YEAR", "CGPA", "DEGREE", "CERTIFICATION", "OTHER"]),
  value: z.union([z.string(), z.number()]),
  disqualifying: z.boolean(),
});
export type JobConstraint = z.infer<typeof jobConstraintSchema>;

export const educationRequirementSchema = z.object({
  degree: z.array(z.string()),
  field: nullish(z.array(z.string())),
  minCgpa: nullish(z.number()),
  disqualifying: z.boolean(),
});
export type EducationRequirement = z.infer<typeof educationRequirementSchema>;

export const experienceRequirementSchema = z.object({
  minMonths: z.number(),
  domain: nullish(z.string()),
  disqualifying: z.boolean(),
});
export type ExperienceRequirement = z.infer<typeof experienceRequirementSchema>;

export const semanticRequirementSchema = z.object({
  description: z.string(),
  importance: z.enum(["HIGH", "MEDIUM", "LOW"]),
  canonicalSkillHints: nullish(z.array(z.string())),
});
export type SemanticRequirement = z.infer<typeof semanticRequirementSchema>;

export const jobProfileSchema = z.object({
  _id: z.string(),
  jobId: z.string(),
  title: z.string(),
  company: nullish(z.string()),
  requiredSkills: z.array(requirementSchema),
  preferredSkills: z.array(requirementSchema),
  responsibilities: z.array(z.string()),
  requiredExperience: nullish(experienceRequirementSchema),
  educationRequirements: nullish(z.array(educationRequirementSchema)),
  certifications: nullish(z.array(z.string())),
  preferredDomains: nullish(z.array(z.string())),
  constraints: z.array(jobConstraintSchema),
  semanticRequirements: z.array(semanticRequirementSchema),
  profileVersion: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type JobProfile = z.infer<typeof jobProfileSchema>;
