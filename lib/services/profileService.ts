import bcrypt from "bcryptjs";
import { userRepository, type UserRepository } from "@/lib/db/repositories/userRepository";
import type { User } from "@/lib/schemas/user";

const MIN_PASSWORD_LENGTH = 8;

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}

export class IncorrectPasswordError extends Error {
  constructor() {
    super("Current password is incorrect");
    this.name = "IncorrectPasswordError";
  }
}

export class PasswordTooShortError extends Error {
  constructor() {
    super(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    this.name = "PasswordTooShortError";
  }
}

export type ProfilePatch = Partial<
  Pick<User, "name" | "phone" | "linkedinUrl" | "githubUrl" | "portfolioUrl" | "rollNumber" | "branch" | "batchYear">
>;

type Deps = {
  users: Pick<UserRepository, "findById" | "updateProfile" | "updatePassword">;
};

const defaultDeps: Deps = { users: userRepository };

/** docs/screens.md §4.8 (feature 27f). */
export async function updateProfile(userId: string, patch: ProfilePatch, deps: Deps = defaultDeps): Promise<User> {
  const updated = await deps.users.updateProfile(userId, patch);
  if (!updated) throw new UserNotFoundError();
  return updated;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  deps: Deps = defaultDeps,
): Promise<void> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new PasswordTooShortError();
  }

  const user = await deps.users.findById(userId);
  if (!user) throw new UserNotFoundError();

  const isCorrect = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCorrect) throw new IncorrectPasswordError();

  const newHash = await bcrypt.hash(newPassword, 10);
  await deps.users.updatePassword(userId, newHash);
}
