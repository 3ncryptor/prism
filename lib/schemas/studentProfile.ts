import { z } from "zod";

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
  proficiency: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  evidence: z.array(z.string()),
  yearsOfExperience: z.number().optional(),
});
export type Skill = z.infer<typeof skillSchema>;

const durationSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

export const projectSchema = z.object({
  title: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  responsibilities: z.array(z.string()),
  outcomes: z.array(z.string()),
  duration: durationSchema.optional(),
  embeddingId: z.string().optional(),
});
export type Project = z.infer<typeof projectSchema>;

export const experienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  description: z.string(),
  responsibilities: z.array(z.string()),
  technologies: z.array(z.string()),
  duration: durationSchema,
  months: z.number().optional(),
});
export type Experience = z.infer<typeof experienceSchema>;

export const educationSchema = z.object({
  degree: z.string(),
  field: z.string(),
  institution: z.string(),
  startYear: z.number().optional(),
  endYear: z.number().optional(),
  cgpa: z.number().optional(),
  evidence: z.array(z.string()),
});
export type Education = z.infer<typeof educationSchema>;

export const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  issuedDate: z.string().optional(),
  evidence: z.array(z.string()),
});
export type Certification = z.infer<typeof certificationSchema>;

export const achievementSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
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
