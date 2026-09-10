import { z } from "zod";
import { nullish } from "@/lib/schemas/zodHelpers";

export const userRoleSchema = z.enum(["STUDENT", "ADMIN"]);
export type UserRole = z.infer<typeof userRoleSchema>;

// docs/screens.md §4.8 (feature 27f): contact/academic identifiers, none of
// which existed on User before — all optional, since a student may not
// have filled them in yet.
export const userSchema = z.object({
  _id: z.string(),
  email: z.email(),
  name: z.string().min(1),
  role: userRoleSchema,
  passwordHash: z.string().min(1),
  phone: nullish(z.string()),
  linkedinUrl: nullish(z.string()),
  githubUrl: nullish(z.string()),
  portfolioUrl: nullish(z.string()),
  rollNumber: nullish(z.string()),
  branch: nullish(z.string()),
  batchYear: nullish(z.number()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof userSchema>;
