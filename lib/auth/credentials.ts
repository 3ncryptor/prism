import bcrypt from "bcryptjs";
import type { UserRepository } from "@/lib/db/repositories/userRepository";
import type { UserRole } from "@/lib/schemas/user";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/** docs/screens.md §7.7 (feature 28): thrown (not returned as null) so it's distinguishable from "wrong credentials". */
export class EmailNotVerifiedError extends Error {
  constructor() {
    super("Email not verified");
    this.name = "EmailNotVerifiedError";
  }
}

/**
 * Pure credential-verification logic, kept separate from the NextAuth
 * Credentials provider's `authorize` callback so it's unit-testable without
 * spinning up NextAuth itself (AGENTS.md tdd-guide requirement).
 *
 * Full timing-attack resistance (constant-time response regardless of
 * whether the email exists) is deferred to feature #27 hardening — this
 * only guarantees a wrong password and a nonexistent email both return
 * `null`, not a 500 or a different error shape.
 */
export async function verifyCredentials(
  email: string | undefined,
  password: string | undefined,
  users: Pick<UserRepository, "findByEmail">,
): Promise<AuthenticatedUser | null> {
  if (!email || !password) {
    return null;
  }

  const user = await users.findByEmail(email);
  if (!user) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return null;
  }

  if (!user.emailVerified) {
    throw new EmailNotVerifiedError();
  }

  return { id: user._id, email: user.email, name: user.name, role: user.role };
}
