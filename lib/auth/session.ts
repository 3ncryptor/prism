import type { Session } from "next-auth";
import { auth } from "@/lib/auth/config";

/**
 * Explicit single-signature wrapper around NextAuth's heavily-overloaded
 * `auth()` (it also doubles as a middleware/route-handler wrapper) — the
 * overload union otherwise makes `jest.MockedFunction<typeof getSession>`
 * infer `never` for its mock return type in tests.
 */
export async function getSession(): Promise<Session | null> {
  return auth();
}

