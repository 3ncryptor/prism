import { z } from "zod";

export const userRoleSchema = z.enum(["STUDENT", "ADMIN"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  _id: z.string(),
  email: z.email(),
  name: z.string().min(1),
  role: userRoleSchema,
  passwordHash: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof userSchema>;
