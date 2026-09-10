import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { userRepository } from "@/lib/db/repositories/userRepository";
import { verifyCredentials } from "@/lib/auth/credentials";

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
      authorize: (credentials) =>
        verifyCredentials(
          credentials?.email as string | undefined,
          credentials?.password as string | undefined,
          userRepository,
        ),
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
