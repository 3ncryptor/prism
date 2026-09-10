import type { Collection } from "mongodb";
import { UserRepository, type UserDocument } from "@/lib/db/repositories/userRepository";
import { FakeCollection } from "../../helpers/fakeCollection";

function makeRepository() {
  const fake = new FakeCollection<UserDocument>();
  const repository = new UserRepository(
    async () => fake as unknown as Collection<UserDocument>,
  );
  return { fake, repository };
}

describe("UserRepository", () => {
  it("create then findByEmail returns the same user", async () => {
    const { repository } = makeRepository();

    const created = await repository.create({
      email: "admin@prism.dev",
      name: "Admin",
      passwordHash: "hash",
      role: "ADMIN",
    });

    expect(await repository.findByEmail("admin@prism.dev")).toEqual(created);
  });

  it("findById returns the user by its generated id", async () => {
    const { repository } = makeRepository();

    const created = await repository.create({
      email: "student1@prism.dev",
      name: "Student One",
      passwordHash: "hash",
      role: "STUDENT",
    });

    const found = await repository.findById(created._id);

    expect(found?.email).toBe("student1@prism.dev");
  });

  it("findByEmail returns null for a nonexistent email", async () => {
    const { repository } = makeRepository();

    expect(await repository.findByEmail("nobody@prism.dev")).toBeNull();
  });

  it("upsertByEmail creates on first call and updates (not duplicates) on second", async () => {
    const { repository, fake } = makeRepository();

    const first = await repository.upsertByEmail({
      email: "student2@prism.dev",
      name: "Student Two",
      passwordHash: "hash-v1",
      role: "STUDENT",
    });

    const second = await repository.upsertByEmail({
      email: "student2@prism.dev",
      name: "Student Two Renamed",
      passwordHash: "hash-v2",
      role: "STUDENT",
    });

    expect(second._id).toBe(first._id);
    expect(second.name).toBe("Student Two Renamed");
    expect(second.passwordHash).toBe("hash-v2");
    expect(await fake.countDocuments({ email: "student2@prism.dev" })).toBe(1);
  });

  it("updateProfile patches only the given fields, leaving others untouched", async () => {
    const { repository } = makeRepository();
    const created = await repository.create({
      email: "student3@prism.dev",
      name: "Student Three",
      passwordHash: "hash",
      role: "STUDENT",
    });

    const updated = await repository.updateProfile(created._id, {
      phone: "+91-9876543210",
      branch: "Computer Science",
      batchYear: 2026,
    });

    expect(updated?.phone).toBe("+91-9876543210");
    expect(updated?.branch).toBe("Computer Science");
    expect(updated?.batchYear).toBe(2026);
    expect(updated?.name).toBe("Student Three");
    expect(updated?.email).toBe("student3@prism.dev");
  });

  it("updateProfile returns null for a nonexistent user", async () => {
    const { repository } = makeRepository();
    expect(await repository.updateProfile("507f1f77bcf86cd799439011", { phone: "123" })).toBeNull();
  });

  it("updatePassword replaces the password hash without touching other fields", async () => {
    const { repository } = makeRepository();
    const created = await repository.create({
      email: "student4@prism.dev",
      name: "Student Four",
      passwordHash: "old-hash",
      role: "STUDENT",
    });

    await repository.updatePassword(created._id, "new-hash");

    const found = await repository.findById(created._id);
    expect(found?.passwordHash).toBe("new-hash");
    expect(found?.email).toBe("student4@prism.dev");
  });
});
