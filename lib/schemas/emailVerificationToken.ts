import { z } from "zod";

/**
 * docs/screens.md §7.7 (feature 28). Same shape/lifecycle as
 * passwordResetToken.ts (SHA-256 hash of the raw token, never the raw
 * token itself; single-use via `usedAt`; time-limited via `expiresAt`) —
 * a separate sibling collection, not a reuse of the password-reset one,
 * since the two serve different purposes with different expiry windows
 * (verification links live longer — no urgency the way a password-reset
 * request has).
 */
export const emailVerificationTokenSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  tokenHash: z.string(),
  expiresAt: z.date(),
  usedAt: z.date().nullable(),
  createdAt: z.date(),
});
export type EmailVerificationToken = z.infer<typeof emailVerificationTokenSchema>;
