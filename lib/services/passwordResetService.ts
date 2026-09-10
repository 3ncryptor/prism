import crypto from "crypto";
import bcrypt from "bcryptjs";
import { userRepository, type UserRepository } from "@/lib/db/repositories/userRepository";
import {
  passwordResetTokenRepository,
  type PasswordResetTokenRepository,
} from "@/lib/db/repositories/passwordResetTokenRepository";
import { getEmailProvider } from "@/lib/email";
import type { EmailProvider } from "@/lib/email/emailProvider";
import { getAppBaseUrl } from "@/lib/config/env";

const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export class PasswordTooShortError extends Error {
  constructor() {
    super(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    this.name = "PasswordTooShortError";
  }
}

export class InvalidOrExpiredTokenError extends Error {
  constructor() {
    super("This password reset link is invalid or has expired");
    this.name = "InvalidOrExpiredTokenError";
  }
}

type Deps = {
  users: Pick<UserRepository, "findByEmail" | "updatePassword">;
  tokens: Pick<PasswordResetTokenRepository, "create" | "findValidByTokenHash" | "markUsed">;
  email: EmailProvider;
  appBaseUrl: string;
};

function defaultDeps(): Deps {
  return {
    users: userRepository,
    tokens: passwordResetTokenRepository,
    email: getEmailProvider(),
    appBaseUrl: getAppBaseUrl(),
  };
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * docs/screens.md §4.3 (feature 27g). Always resolves regardless of whether
 * `email` belongs to an account — callers must show the same generic
 * response either way, so this never reveals which emails are registered.
 */
export async function requestPasswordReset(email: string, deps: Deps = defaultDeps()): Promise<void> {
  const user = await deps.users.findByEmail(email);
  if (!user) return;

  const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await deps.tokens.create({ userId: user._id, tokenHash, expiresAt });

  const resetUrl = `${deps.appBaseUrl}/reset-password?token=${rawToken}`;
  await deps.email.sendPasswordResetEmail(user.email, resetUrl);
}

/** docs/screens.md §4.4 (feature 27g). */
export async function resetPassword(rawToken: string, newPassword: string, deps: Deps = defaultDeps()): Promise<void> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new PasswordTooShortError();
  }

  const tokenHash = hashToken(rawToken);
  const token = await deps.tokens.findValidByTokenHash(tokenHash);
  if (!token) throw new InvalidOrExpiredTokenError();

  const newHash = await bcrypt.hash(newPassword, 10);
  await deps.users.updatePassword(token.userId, newHash);
  await deps.tokens.markUsed(token._id);
}
