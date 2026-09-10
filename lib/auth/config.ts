import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { userRepository } from "@/lib/db/repositories/userRepository";
import { verifyCredentials, EmailNotVerifiedError } from "@/lib/auth/credentials";

/**
 * docs/screens.md §7.4/§7.7 (feature 28). A `CredentialsSignin` subclass so
 * its `code` survives being thrown out of `authorize()` through `signIn()`
 * into the sign-in page's server action catch block (Auth.js's documented
 * behavior for frameworks that handle form actions server-side, which
 * Next.js Server Actions are) — lets Sign In show a distinct "verify your
 * email" message instead of the generic "invalid credentials" one.
 */
class EmailNotVerifiedSignInError extends CredentialsSignin {
  code = "email-not-verified";
}

// Explicit, deliberate session lifetime rather than NextAuth's implicit
// 30-day default — this app holds student PII and gates admin access to
// match results, so an unbounded-feeling session isn't the right default
// to inherit silently. 24h balances re-login friction against exposure
// window for a tool used across a work day by both roles.
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          return await verifyCredentials(
            credentials?.email as string | undefined,
            credentials?.password as string | undefined,
            userRepository,
          );
        } catch (error) {
          if (error instanceof EmailNotVerifiedError) {
            throw new EmailNotVerifiedSignInError();
          }
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
