import {
  requestPasswordReset,
  resetPassword,
  PasswordTooShortError,
  InvalidOrExpiredTokenError,
} from "@/lib/services/passwordResetService";
import type { User } from "@/lib/schemas/user";
import type { PasswordResetToken } from "@/lib/schemas/passwordResetToken";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    _id: "user-1",
    email: "student1@prism.dev",
    name: "Student One",
    role: "STUDENT",
    passwordHash: "irrelevant",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeToken(overrides: Partial<PasswordResetToken> = {}): PasswordResetToken {
  return {
    _id: "token-1",
    userId: "user-1",
    tokenHash: "irrelevant-hash",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function baseDeps() {
  return {
    users: { findByEmail: jest.fn(), updatePassword: jest.fn() },
    tokens: { create: jest.fn(), findValidByTokenHash: jest.fn(), markUsed: jest.fn() },
    email: { sendPasswordResetEmail: jest.fn(), sendVerificationEmail: jest.fn() },
    appBaseUrl: "https://prism.example.edu",
  };
}

function makeDeps(overrides: Partial<ReturnType<typeof baseDeps>> = {}) {
  return { ...baseDeps(), ...overrides };
}

describe("requestPasswordReset", () => {
  it("does nothing and never emails when the account doesn't exist", async () => {
    const deps = makeDeps({ users: { findByEmail: jest.fn().mockResolvedValue(null), updatePassword: jest.fn() } });

    await requestPasswordReset("nobody@prism.dev", deps);

    expect(deps.tokens.create).not.toHaveBeenCalled();
    expect(deps.email.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("creates a hashed token and emails a reset URL built from appBaseUrl when the account exists", async () => {
    const user = makeUser();
    const deps = makeDeps({
      users: { findByEmail: jest.fn().mockResolvedValue(user), updatePassword: jest.fn() },
      tokens: {
        create: jest.fn().mockResolvedValue(makeToken()),
        findValidByTokenHash: jest.fn(),
        markUsed: jest.fn(),
      },
    });

    await requestPasswordReset(user.email, deps);

    expect(deps.tokens.create).toHaveBeenCalledTimes(1);
    const createArgs = deps.tokens.create.mock.calls[0][0];
    expect(createArgs.userId).toBe(user._id);
    expect(typeof createArgs.tokenHash).toBe("string");
    expect(createArgs.tokenHash).not.toHaveLength(0);
    expect(createArgs.expiresAt).toBeInstanceOf(Date);
    expect(createArgs.expiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(deps.email.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const [emailedTo, resetUrl] = deps.email.sendPasswordResetEmail.mock.calls[0];
    expect(emailedTo).toBe(user.email);
    expect(resetUrl.startsWith("https://prism.example.edu/reset-password?token=")).toBe(true);
  });

  it("never persists the raw token — only its hash reaches the repository", async () => {
    const user = makeUser();
    const deps = makeDeps({
      users: { findByEmail: jest.fn().mockResolvedValue(user), updatePassword: jest.fn() },
      tokens: {
        create: jest.fn().mockResolvedValue(makeToken()),
        findValidByTokenHash: jest.fn(),
        markUsed: jest.fn(),
      },
    });

    await requestPasswordReset(user.email, deps);

    const storedHash = deps.tokens.create.mock.calls[0][0].tokenHash;
    const [, resetUrl] = deps.email.sendPasswordResetEmail.mock.calls[0];
    const rawToken = new URL(resetUrl).searchParams.get("token");
    expect(rawToken).not.toBe(storedHash);
  });
});

describe("resetPassword", () => {
  it("throws PasswordTooShortError before touching the token repository", async () => {
    const deps = makeDeps();
    await expect(resetPassword("some-token", "short", deps)).rejects.toThrow(PasswordTooShortError);
    expect(deps.tokens.findValidByTokenHash).not.toHaveBeenCalled();
  });

  it("throws InvalidOrExpiredTokenError when no valid token matches the hash", async () => {
    const deps = makeDeps({
      tokens: { create: jest.fn(), findValidByTokenHash: jest.fn().mockResolvedValue(null), markUsed: jest.fn() },
    });

    await expect(resetPassword("bad-token", "newpassword1", deps)).rejects.toThrow(InvalidOrExpiredTokenError);
    expect(deps.users.updatePassword).not.toHaveBeenCalled();
  });

  it("hashes and stores the new password, then marks the token used, when the token is valid", async () => {
    const token = makeToken({ _id: "token-42", userId: "user-7" });
    const deps = makeDeps({
      users: { findByEmail: jest.fn(), updatePassword: jest.fn().mockResolvedValue(undefined) },
      tokens: {
        create: jest.fn(),
        findValidByTokenHash: jest.fn().mockResolvedValue(token),
        markUsed: jest.fn().mockResolvedValue(undefined),
      },
    });

    await resetPassword("raw-token-value", "newpassword1", deps);

    expect(deps.users.updatePassword).toHaveBeenCalledTimes(1);
    const [calledUserId, storedHash] = deps.users.updatePassword.mock.calls[0];
    expect(calledUserId).toBe("user-7");
    expect(typeof storedHash).toBe("string");
    expect(storedHash).not.toBe("newpassword1");

    expect(deps.tokens.markUsed).toHaveBeenCalledWith("token-42");
  });
});
