import type { Collection } from "mongodb";
import { UserRepository, type UserDocument } from "@/lib/db/repositories/userRepository";
import { seedUsers } from "@/lib/db/seed/seedUsers";
import { FakeCollection } from "../../helpers/fakeCollection";

function makeRepository() {
  const fake = new FakeCollection<UserDocument>();
  const repository = new UserRepository(
    async () => fake as unknown as Collection<UserDocument>,
  );
  return { fake, repository };
}

describe("seedUsers", () => {
  it("is idempotent: running twice does not duplicate or error", async () => {
    const { repository, fake } = makeRepository();

    const first = await seedUsers(repository);
    const second = await seedUsers(repository);

    expect(second).toHaveLength(first.length);
    expect(await fake.countDocuments({})).toBe(first.length);

    const emails = (await fake.find({}).then((r) => r.toArray())).map((u) => u.email);
    expect(new Set(emails).size).toBe(emails.length); // no duplicate emails
  });

  it("seeds exactly one ADMIN and the rest STUDENT", async () => {
    const { repository } = makeRepository();

    const users = await seedUsers(repository);

    expect(users.filter((u) => u.role === "ADMIN")).toHaveLength(1);
    expect(users.filter((u) => u.role === "STUDENT").length).toBeGreaterThan(0);
  });
});
