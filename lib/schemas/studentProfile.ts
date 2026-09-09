import { z } from "zod";

/**
 * LLM providers (instructed by our own prompt to use `null` for absent
 * optional fields, per standard JSON convention) return `null`, not
 * `undefined` — `.optional()` alone rejects `null`. Accept both, normalize
 * to `undefined` so the rest of the codebase's `field?: T` types hold.
 */
function nullish<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .nullish()
    .transform((value) => value ?? undefined) as unknown as z.ZodOptional<T>;
}

export const skillCategorySchema = z.enum([
  "LANGUAGE",
  "FRAMEWORK",
  "DATABASE",
  "CLOUD",
  "TOOL",
  "LIBRARY",
  "CONCEPT",
  "OTHER",
]);

export const skillSchema = z.object({
  name: z.string(),
  canonicalName: z.string(),
  category: skillCategorySchema,
  proficiency: nullish(z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"])),
  evidence: z.array(z.string()),
  yearsOfExperience: nullish(z.number()),
});
export type Skill = z.infer<typeof skillSchema>;

const durationSchema = z.object({
  start: nullish(z.string()),
  end: nullish(z.string()),
});

export const projectSchema = z.object({
  title: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  responsibilities: z.array(z.string()),
  outcomes: z.array(z.string()),
  duration: nullish(durationSchema),
  embeddingId: nullish(z.string()),
});
export type Project = z.infer<typeof projectSchema>;

export const experienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  description: z.string(),
  responsibilities: z.array(z.string()),
  technologies: z.array(z.string()),
  duration: durationSchema,
  months: nullish(z.number()),
});
export type Experience = z.infer<typeof experienceSchema>;

export const educationSchema = z.object({
  degree: z.string(),
  field: z.string(),
  institution: z.string(),
  startYear: nullish(z.number()),
  endYear: nullish(z.number()),
  cgpa: nullish(z.number()),
  evidence: z.array(z.string()),
});
export type Education = z.infer<typeof educationSchema>;

export const certificationSchema = z.object({
  name: z.string(),
  issuer: nullish(z.string()),
  issuedDate: nullish(z.string()),
  evidence: z.array(z.string()),
});
export type Certification = z.infer<typeof certificationSchema>;

export const achievementSchema = z.object({
  title: z.string(),
  description: nullish(z.string()),
  evidence: z.array(z.string()),
});
export type Achievement = z.infer<typeof achievementSchema>;

export const studentProfileSchema = z.object({
  _id: z.string(),
  studentId: z.string(),
  resumeId: z.string(),
  isActive: z.boolean(),
  education: z.array(educationSchema),
  skills: z.array(skillSchema),
  experience: z.array(experienceSchema),
  projects: z.array(projectSchema),
  certifications: z.array(certificationSchema),
  achievements: z.array(achievementSchema),
  coursework: z.array(z.string()),
  languages: z.array(z.string()),
  totalExperienceMonths: z.number(),
  profileVersion: z.number(),
  extractionMetadata: z.object({
    model: z.string(),
    promptVersion: z.string(),
    extractedAt: z.date(),
    confidence: z.number().optional(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type StudentProfile = z.infer<typeof studentProfileSchema>;
