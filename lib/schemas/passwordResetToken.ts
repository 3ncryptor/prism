import { z } from "zod";

/**
 * docs/screens.md §4.3/§4.4 (feature 27g). `tokenHash` is a SHA-256 digest
 * of the raw token — the raw token itself only ever exists in the emailed
 * link and briefly in request memory, never persisted. Single-use
 * (`usedAt`), time-limited (`expiresAt`), matching standard password-reset
 * token practice (e.g. Laravel/Django's own approach).
 */
export const passwordResetTokenSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  tokenHash: z.string(),
  expiresAt: z.date(),
  usedAt: z.date().nullable(),
  createdAt: z.date(),
});
export type PasswordResetToken = z.infer<typeof passwordResetTokenSchema>;
