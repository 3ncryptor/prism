import { z } from "zod";

export const requirementSchema = z.object({
  name: z.string(),
  canonicalName: z.string(),
  category: z.string(),
  importance: z.enum(["MANDATORY", "HIGH", "MEDIUM", "LOW"]),
  evidence: z.string().optional(),
  yearsRequired: z.number().optional(),
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
  field: z.array(z.string()).optional(),
  minCgpa: z.number().optional(),
  disqualifying: z.boolean(),
});
export type EducationRequirement = z.infer<typeof educationRequirementSchema>;

export const experienceRequirementSchema = z.object({
  minMonths: z.number(),
  domain: z.string().optional(),
  disqualifying: z.boolean(),
});
export type ExperienceRequirement = z.infer<typeof experienceRequirementSchema>;

export const semanticRequirementSchema = z.object({
  description: z.string(),
  importance: z.enum(["HIGH", "MEDIUM", "LOW"]),
  canonicalSkillHints: z.array(z.string()).optional(),
});
export type SemanticRequirement = z.infer<typeof semanticRequirementSchema>;

export const jobProfileSchema = z.object({
  _id: z.string(),
  jobId: z.string(),
  title: z.string(),
  company: z.string().optional(),
  requiredSkills: z.array(requirementSchema),
  preferredSkills: z.array(requirementSchema),
  responsibilities: z.array(z.string()),
  requiredExperience: experienceRequirementSchema.optional(),
  educationRequirements: z.array(educationRequirementSchema).optional(),
  certifications: z.array(z.string()).optional(),
  preferredDomains: z.array(z.string()).optional(),
  constraints: z.array(jobConstraintSchema),
  semanticRequirements: z.array(semanticRequirementSchema),
  profileVersion: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type JobProfile = z.infer<typeof jobProfileSchema>;
