import crypto from "crypto";
import bcrypt from "bcryptjs";
import { userRepository, type UserRepository } from "@/lib/db/repositories/userRepository";
import {
  emailVerificationTokenRepository,
  type EmailVerificationTokenRepository,
} from "@/lib/db/repositories/emailVerificationTokenRepository";
import { getEmailProvider } from "@/lib/email";
import type { EmailProvider } from "@/lib/email/emailProvider";
import { getAppBaseUrl, getSignupAllowedEmailDomain } from "@/lib/config/env";

const MIN_PASSWORD_LENGTH = 8;
const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export class PasswordTooShortError extends Error {
  constructor() {
    super(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    this.name = "PasswordTooShortError";
  }
}

export class EmailDomainNotAllowedError extends Error {
  constructor(public readonly domain: string) {
    super(`Sign up with your @${domain} email address.`);
    this.name = "EmailDomainNotAllowedError";
  }
}

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class InvalidOrExpiredTokenError extends Error {
  constructor() {
    super("This verification link is invalid or has expired");
    this.name = "InvalidOrExpiredTokenError";
  }
}

type Deps = {
  users: Pick<UserRepository, "findByEmail" | "create" | "markEmailVerified">;
  tokens: Pick<EmailVerificationTokenRepository, "create" | "findValidByTokenHash" | "markUsed">;
  email: EmailProvider;
  appBaseUrl: string;
  allowedDomain: string | null;
};

function defaultDeps(): Deps {
  return {
    users: userRepository,
    tokens: emailVerificationTokenRepository,
    email: getEmailProvider(),
    appBaseUrl: getAppBaseUrl(),
    allowedDomain: getSignupAllowedEmailDomain(),
  };
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

async function issueAndSendVerification(userId: string, email: string, deps: Deps): Promise<void> {
  const rawToken = crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await deps.tokens.create({ userId, tokenHash, expiresAt });

  const verifyUrl = `${deps.appBaseUrl}/verify-email?token=${rawToken}`;
  await deps.email.sendVerificationEmail(email, verifyUrl);
}

/**
 * docs/screens.md §7.1/§7.6 (feature 28). Always creates a STUDENT account
 * — role is never a parameter here, that's the security boundary: this
 * path can never produce an ADMIN account.
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
  deps: Deps = defaultDeps(),
): Promise<void> {
  if (deps.allowedDomain && !email.toLowerCase().endsWith(`@${deps.allowedDomain.toLowerCase()}`)) {
    throw new EmailDomainNotAllowedError(deps.allowedDomain);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new PasswordTooShortError();
  }

  const existing = await deps.users.findByEmail(email);
  if (existing) throw new EmailAlreadyRegisteredError();

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await deps.users.create({ email, name, passwordHash, role: "STUDENT", emailVerified: null });

  await issueAndSendVerification(user._id, user.email, deps);
}

/** docs/screens.md §7.2/§7.6 (feature 28). */
export async function verifyEmail(rawToken: string, deps: Deps = defaultDeps()): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const token = await deps.tokens.findValidByTokenHash(tokenHash);
  if (!token) throw new InvalidOrExpiredTokenError();

  await deps.users.markEmailVerified(token.userId);
  await deps.tokens.markUsed(token._id);
}

/**
 * docs/screens.md §7.3/§7.6 (feature 28). Always resolves regardless of
 * whether `email` belongs to an account or is already verified — same
 * non-enumerating shape as passwordResetService.requestPasswordReset.
 */
export async function resendVerification(email: string, deps: Deps = defaultDeps()): Promise<void> {
  const user = await deps.users.findByEmail(email);
  if (!user || user.emailVerified) return;

  await issueAndSendVerification(user._id, user.email, deps);
}
