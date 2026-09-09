import type { UserRole } from "@/lib/schemas/user";

/**
 * Pure redirect decision for role-gated routes, extracted out of `proxy.ts`
 * so it's unit-testable without a real request/session (AGENTS.md
 * tdd-guide requirement).
 */
export function resolveProtectedRouteRedirect(input: {
  pathname: string;
  role: UserRole | undefined;
}): string | null {
  const { pathname, role } = input;

  const isStudentPath = pathname.startsWith("/student");
  const isAdminPath = pathname.startsWith("/admin");

  if (!isStudentPath && !isAdminPath) {
    return null;
  }

  if (!role) {
    return "/sign-in";
  }

  if (isStudentPath && role !== "STUDENT") {
    return role === "ADMIN" ? "/admin" : "/sign-in";
  }

  if (isAdminPath && role !== "ADMIN") {
    return role === "STUDENT" ? "/student" : "/sign-in";
  }

  return null;
}
