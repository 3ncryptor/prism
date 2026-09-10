import {
  registerUser,
  verifyEmail,
  resendVerification,
  EmailDomainNotAllowedError,
  EmailAlreadyRegisteredError,
  PasswordTooShortError,
  InvalidOrExpiredTokenError,
} from "@/lib/services/signupService";
import type { User } from "@/lib/schemas/user";
import type { EmailVerificationToken } from "@/lib/schemas/emailVerificationToken";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    _id: "user-1",
    email: "student1@campus.edu",
    name: "Student One",
    role: "STUDENT",
    passwordHash: "irrelevant",
    emailVerified: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeToken(overrides: Partial<EmailVerificationToken> = {}): EmailVerificationToken {
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
    users: {
      findByEmail: jest.fn(),
      create: jest.fn(),
      markEmailVerified: jest.fn(),
    },
    tokens: { create: jest.fn(), findValidByTokenHash: jest.fn(), markUsed: jest.fn() },
    email: { sendPasswordResetEmail: jest.fn(), sendVerificationEmail: jest.fn() },
    appBaseUrl: "https://prism.example.edu",
    allowedDomain: null as string | null,
  };
}

function makeDeps(overrides: Partial<ReturnType<typeof baseDeps>> = {}) {
  return { ...baseDeps(), ...overrides };
}

describe("registerUser", () => {
  it("rejects an email outside the allowed domain when one is configured", async () => {
    const deps = makeDeps({ allowedDomain: "campus.edu" });
    await expect(registerUser("Student", "someone@gmail.com", "password1", deps)).rejects.toThrow(
      EmailDomainNotAllowedError,
    );
    expect(deps.users.findByEmail).not.toHaveBeenCalled();
  });

  it("allows an email matching the configured domain", async () => {
    const deps = makeDeps({
      allowedDomain: "campus.edu",
      users: {
        findByEmail: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(makeUser()),
        markEmailVerified: jest.fn(),
      },
      tokens: { create: jest.fn().mockResolvedValue(makeToken()), findValidByTokenHash: jest.fn(), markUsed: jest.fn() },
    });

    await registerUser("Student", "student1@campus.edu", "password1", deps);

    expect(deps.users.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "student1@campus.edu", role: "STUDENT", emailVerified: null }),
    );
  });

  it("never allows a role other than STUDENT — role isn't even a parameter", async () => {
    const deps = makeDeps({
      users: {
        findByEmail: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(makeUser()),
        markEmailVerified: jest.fn(),
      },
      tokens: { create: jest.fn().mockResolvedValue(makeToken()), findValidByTokenHash: jest.fn(), markUsed: jest.fn() },
    });

    await registerUser("Student", "student1@campus.edu", "password1", deps);

    const createArgs = deps.users.create.mock.calls[0][0];
    expect(createArgs.role).toBe("STUDENT");
  });

  it("rejects a password shorter than the minimum", async () => {
    const deps = makeDeps();
    await expect(registerUser("Student", "student1@campus.edu", "short", deps)).rejects.toThrow(PasswordTooShortError);
    expect(deps.users.findByEmail).not.toHaveBeenCalled();
  });

  it("rejects a duplicate email", async () => {
    const deps = makeDeps({ users: { findByEmail: jest.fn().mockResolvedValue(makeUser()), create: jest.fn(), markEmailVerified: jest.fn() } });
    await expect(registerUser("Student", "student1@campus.edu", "password1", deps)).rejects.toThrow(
      EmailAlreadyRegisteredError,
    );
    expect(deps.users.create).not.toHaveBeenCalled();
  });

  it("creates the user with emailVerified: null and sends a verification email", async () => {
    const user = makeUser();
    const deps = makeDeps({
      users: { findByEmail: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(user), markEmailVerified: jest.fn() },
      tokens: { create: jest.fn().mockResolvedValue(makeToken()), findValidByTokenHash: jest.fn(), markUsed: jest.fn() },
    });

    await registerUser("Student One", user.email, "password1", deps);

    expect(deps.users.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: user.email, name: "Student One", emailVerified: null }),
    );
    expect(deps.tokens.create).toHaveBeenCalledTimes(1);
    expect(deps.email.sendVerificationEmail).toHaveBeenCalledTimes(1);
    const [emailedTo, verifyUrl] = deps.email.sendVerificationEmail.mock.calls[0];
    expect(emailedTo).toBe(user.email);
    expect(verifyUrl.startsWith("https://prism.example.edu/verify-email?token=")).toBe(true);
  });

  it("never persists the raw token — only its hash reaches the repository", async () => {
    const user = makeUser();
    const deps = makeDeps({
      users: { findByEmail: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(user), markEmailVerified: jest.fn() },
      tokens: { create: jest.fn().mockResolvedValue(makeToken()), findValidByTokenHash: jest.fn(), markUsed: jest.fn() },
    });

    await registerUser("Student One", user.email, "password1", deps);

    const storedHash = deps.tokens.create.mock.calls[0][0].tokenHash;
    const [, verifyUrl] = deps.email.sendVerificationEmail.mock.calls[0];
    const rawToken = new URL(verifyUrl).searchParams.get("token");
    expect(rawToken).not.toBe(storedHash);
  });
});

describe("verifyEmail", () => {
  it("throws InvalidOrExpiredTokenError when no valid token matches", async () => {
    const deps = makeDeps({
      tokens: { create: jest.fn(), findValidByTokenHash: jest.fn().mockResolvedValue(null), markUsed: jest.fn() },
    });
    await expect(verifyEmail("bad-token", deps)).rejects.toThrow(InvalidOrExpiredTokenError);
    expect(deps.users.markEmailVerified).not.toHaveBeenCalled();
  });

  it("marks the user verified and the token used when valid", async () => {
    const token = makeToken({ _id: "token-42", userId: "user-7" });
    const deps = makeDeps({
      tokens: {
        create: jest.fn(),
        findValidByTokenHash: jest.fn().mockResolvedValue(token),
        markUsed: jest.fn().mockResolvedValue(undefined),
      },
    });

    await verifyEmail("raw-token-value", deps);

    expect(deps.users.markEmailVerified).toHaveBeenCalledWith("user-7");
    expect(deps.tokens.markUsed).toHaveBeenCalledWith("token-42");
  });
});

describe("resendVerification", () => {
  it("does nothing when the account doesn't exist", async () => {
    const deps = makeDeps({ users: { findByEmail: jest.fn().mockResolvedValue(null), create: jest.fn(), markEmailVerified: jest.fn() } });
    await resendVerification("nobody@campus.edu", deps);
    expect(deps.tokens.create).not.toHaveBeenCalled();
  });

  it("does nothing when the account is already verified", async () => {
    const deps = makeDeps({
      users: { findByEmail: jest.fn().mockResolvedValue(makeUser({ emailVerified: new Date() })), create: jest.fn(), markEmailVerified: jest.fn() },
    });
    await resendVerification("student1@campus.edu", deps);
    expect(deps.tokens.create).not.toHaveBeenCalled();
  });

  it("issues a new token and email when unverified", async () => {
    const user = makeUser();
    const deps = makeDeps({
      users: { findByEmail: jest.fn().mockResolvedValue(user), create: jest.fn(), markEmailVerified: jest.fn() },
      tokens: { create: jest.fn().mockResolvedValue(makeToken()), findValidByTokenHash: jest.fn(), markUsed: jest.fn() },
    });

    await resendVerification(user.email, deps);

    expect(deps.tokens.create).toHaveBeenCalledTimes(1);
    expect(deps.email.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });
});
