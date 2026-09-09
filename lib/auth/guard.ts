import type { Session } from "next-auth";
import { getSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/schemas/user";

export class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(role: UserRole) {
    super(`Requires ${role} role`);
    this.name = "ForbiddenError";
  }
}

/**
 * Server-side role gate (buildPlan.md §5.6, §81). Reads only from the
 * session produced by NextAuth's `auth()` — never from a request body,
 * header, or client-supplied field.
 */
export async function requireRole(role: UserRole): Promise<Session> {
  const session = await getSession();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  if (session.user.role !== role) {
    throw new ForbiddenError(role);
  }
  return session;
}
