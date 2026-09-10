import bcrypt from "bcryptjs";
import { verifyCredentials, EmailNotVerifiedError } from "@/lib/auth/credentials";
import type { User } from "@/lib/schemas/user";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    _id: "user-1",
    email: "student1@prism.dev",
    name: "Student One",
    role: "STUDENT",
    passwordHash: "",
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("verifyCredentials", () => {
  it("returns null when email or password is missing", async () => {
    const users = { findByEmail: jest.fn() };

    expect(await verifyCredentials(undefined, "password", users)).toBeNull();
    expect(await verifyCredentials("a@b.com", undefined, users)).toBeNull();
    expect(users.findByEmail).not.toHaveBeenCalled();
  });

  it("returns null when no user exists for the email", async () => {
    const users = { findByEmail: jest.fn().mockResolvedValue(null) };

    const result = await verifyCredentials("nobody@prism.dev", "anything", users);

    expect(result).toBeNull();
  });

  it("returns null when the password does not match", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);
    const users = { findByEmail: jest.fn().mockResolvedValue(makeUser({ passwordHash })) };

    const result = await verifyCredentials("student1@prism.dev", "wrong-password", users);

    expect(result).toBeNull();
  });

  it("returns the authenticated user (mapped id/role) when credentials are correct", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);
    const users = {
      findByEmail: jest.fn().mockResolvedValue(
        makeUser({ passwordHash, role: "ADMIN", _id: "admin-1" }),
      ),
    };

    const result = await verifyCredentials("student1@prism.dev", "correct-password", users);

    expect(result).toEqual({
      id: "admin-1",
      email: "student1@prism.dev",
      name: "Student One",
      role: "ADMIN",
    });
  });

  it("throws EmailNotVerifiedError when credentials are correct but the account isn't verified", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);
    const users = {
      findByEmail: jest.fn().mockResolvedValue(makeUser({ passwordHash, emailVerified: undefined })),
    };

    await expect(verifyCredentials("student1@prism.dev", "correct-password", users)).rejects.toThrow(
      EmailNotVerifiedError,
    );
  });
});
