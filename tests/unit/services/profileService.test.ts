import bcrypt from "bcryptjs";
import {
  updateProfile,
  changePassword,
  UserNotFoundError,
  IncorrectPasswordError,
  PasswordTooShortError,
} from "@/lib/services/profileService";
import type { User } from "@/lib/schemas/user";

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

describe("updateProfile", () => {
  it("throws UserNotFoundError when the repository can't find the user", async () => {
    const deps = { users: { findById: jest.fn(), updateProfile: jest.fn().mockResolvedValue(null), updatePassword: jest.fn() } };
    await expect(updateProfile("missing", { phone: "123" }, deps)).rejects.toThrow(UserNotFoundError);
  });

  it("passes the patch straight through and returns the updated user", async () => {
    const updated = makeUser({ phone: "+91-9876543210", branch: "Computer Science" });
    const deps = { users: { findById: jest.fn(), updateProfile: jest.fn().mockResolvedValue(updated), updatePassword: jest.fn() } };

    const result = await updateProfile("user-1", { phone: "+91-9876543210", branch: "Computer Science" }, deps);

    expect(deps.users.updateProfile).toHaveBeenCalledWith("user-1", { phone: "+91-9876543210", branch: "Computer Science" });
    expect(result).toEqual(updated);
  });
});

describe("changePassword", () => {
  it("throws PasswordTooShortError before touching the database", async () => {
    const deps = { users: { findById: jest.fn(), updateProfile: jest.fn(), updatePassword: jest.fn() } };
    await expect(changePassword("user-1", "current", "short", deps)).rejects.toThrow(PasswordTooShortError);
    expect(deps.users.findById).not.toHaveBeenCalled();
  });

  it("throws UserNotFoundError when the user doesn't exist", async () => {
    const deps = { users: { findById: jest.fn().mockResolvedValue(null), updateProfile: jest.fn(), updatePassword: jest.fn() } };
    await expect(changePassword("missing", "current", "newpassword1", deps)).rejects.toThrow(UserNotFoundError);
  });

  it("throws IncorrectPasswordError when the current password doesn't match", async () => {
    const realHash = await bcrypt.hash("correct-password", 10);
    const deps = {
      users: { findById: jest.fn().mockResolvedValue(makeUser({ passwordHash: realHash })), updateProfile: jest.fn(), updatePassword: jest.fn() },
    };

    await expect(changePassword("user-1", "wrong-password", "newpassword1", deps)).rejects.toThrow(IncorrectPasswordError);
    expect(deps.users.updatePassword).not.toHaveBeenCalled();
  });

  it("hashes and stores the new password when the current one is correct", async () => {
    const realHash = await bcrypt.hash("correct-password", 10);
    const deps = {
      users: {
        findById: jest.fn().mockResolvedValue(makeUser({ passwordHash: realHash })),
        updateProfile: jest.fn(),
        updatePassword: jest.fn().mockResolvedValue(undefined),
      },
    };

    await changePassword("user-1", "correct-password", "newpassword1", deps);

    expect(deps.users.updatePassword).toHaveBeenCalledTimes(1);
    const [calledUserId, storedHash] = deps.users.updatePassword.mock.calls[0];
    expect(calledUserId).toBe("user-1");
    expect(await bcrypt.compare("newpassword1", storedHash)).toBe(true);
  });
});
