import bcrypt from "bcryptjs";
import type { UserRepository } from "@/lib/db/repositories/userRepository";
import type { User } from "@/lib/schemas/user";

/** Dev-only credential, never used outside local/seeded environments. */
export const DEV_PASSWORD = "prism-dev-password";

const SEED_USERS = [
  { email: "admin@prism.dev", name: "Admin", role: "ADMIN" as const },
  { email: "student1@prism.dev", name: "Student One", role: "STUDENT" as const },
  { email: "student2@prism.dev", name: "Student Two", role: "STUDENT" as const },
  { email: "student3@prism.dev", name: "Student Three", role: "STUDENT" as const },
];

/**
 * Idempotent (buildPlan.md §56): re-running upserts by email rather than
 * inserting, so `npm run seed` can be run repeatedly without duplicating
 * accounts or erroring.
 */
export async function seedUsers(
  users: Pick<UserRepository, "upsertByEmail">,
): Promise<User[]> {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  const created: User[] = [];
  for (const seedUser of SEED_USERS) {
    created.push(await users.upsertByEmail({ ...seedUser, passwordHash }));
  }
  return created;
}
