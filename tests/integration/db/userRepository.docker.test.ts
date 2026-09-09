import type { Collection } from "mongodb";
import { UserRepository, type UserDocument } from "@/lib/db/repositories/userRepository";
import { startMongoContainer } from "../mongoContainer";

describe("UserRepository (real MongoDB via Docker)", () => {
  let stop: () => Promise<void>;
  let collection: Collection<UserDocument>;
  let repository: UserRepository;

  beforeAll(async () => {
    const mongo = await startMongoContainer();
    stop = mongo.stop;
    collection = mongo.client.db("prism-test").collection<UserDocument>("users");
    repository = new UserRepository(async () => collection);
  }, 120_000);

  afterAll(async () => {
    await stop();
  }, 30_000);

  it("create then findByEmail returns the same user", async () => {
    const created = await repository.create({
      email: "docker-admin@prism.dev",
      name: "Docker Admin",
      passwordHash: "hash",
      role: "ADMIN",
    });

    expect(await repository.findByEmail("docker-admin@prism.dev")).toEqual(created);
  });

  it("upsertByEmail creates on first call and updates (not duplicates) on second", async () => {
    const first = await repository.upsertByEmail({
      email: "docker-student@prism.dev",
      name: "Docker Student",
      passwordHash: "hash-v1",
      role: "STUDENT",
    });

    const second = await repository.upsertByEmail({
      email: "docker-student@prism.dev",
      name: "Docker Student Renamed",
      passwordHash: "hash-v2",
      role: "STUDENT",
    });

    expect(second._id).toBe(first._id);
    expect(second.name).toBe("Docker Student Renamed");
    expect(await collection.countDocuments({ email: "docker-student@prism.dev" })).toBe(1);
  });
});
