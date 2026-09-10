import type { Db, MongoClient } from "mongodb";
import { ResumeRepository, type ResumeDocument } from "@/lib/db/repositories/resumeRepository";
import {
  StudentProfileRepository,
  type StudentProfileDocument,
} from "@/lib/db/repositories/studentProfileRepository";
import { JobRepository, type JobDocument } from "@/lib/db/repositories/jobRepository";
import {
  JobProfileRepository,
  type JobProfileDocument,
} from "@/lib/db/repositories/jobProfileRepository";
import {
  ProcessingJobRepository,
  type ProcessingJobDocument,
} from "@/lib/db/repositories/processingJobRepository";
import { ensureIndexes } from "@/lib/db/indexes";
import { startMongoContainer } from "../mongoContainer";

describe("Feature #3 repositories (real MongoDB via Docker)", () => {
  let stop: () => Promise<void>;
  let db: Db;
  let client: MongoClient;

  beforeAll(async () => {
    const mongo = await startMongoContainer();
    stop = mongo.stop;
    client = mongo.client;
    db = client.db("prism-test");
    await ensureIndexes(db);
  }, 120_000);

  afterAll(async () => {
    await stop();
  }, 30_000);

  it("ensureIndexes creates the expected indexes", async () => {
    const jobIndexes = await db.collection("jobs").listIndexes().toArray();
    expect(jobIndexes.some((i) => i.key.status === 1)).toBe(true);
    expect(jobIndexes.some((i) => i.key.publishedMatchRunId === 1)).toBe(true);

    const userIndexes = await db.collection("users").listIndexes().toArray();
    expect(userIndexes.some((i) => i.key.email === 1 && i.unique)).toBe(true);
  });

  it("ResumeRepository: create, get, getActiveByStudent, listByStudent, updateStatus, setActive", async () => {
    const repo = new ResumeRepository(async () =>
      db.collection<ResumeDocument>("resumes"),
    );

    const resume = await repo.create({
      studentId: "student-1",
      label: "Software Dev Resume",
      fileKey: "resumes/student-1/r1.pdf",
      originalName: "resume.pdf",
    });
    expect(resume.status).toBe("UPLOADED");
    // docs/screens.md §4.6 (feature 27d): upload no longer auto-publishes.
    expect(resume.isActive).toBe(false);

    await repo.updateStatus(resume._id, "READY");
    expect((await repo.get(resume._id))?.status).toBe("READY");

    expect(await repo.getActiveByStudent("student-1")).toBeNull();
    await repo.setActive(resume._id, "student-1");
    expect((await repo.getActiveByStudent("student-1"))?._id).toBe(resume._id);
    expect(await repo.listByStudent("student-1")).toHaveLength(1);

    await repo.setFileKey(resume._id, "resumes/student-1/resume-1/original.pdf");
    expect((await repo.get(resume._id))?.fileKey).toBe(
      "resumes/student-1/resume-1/original.pdf",
    );
  });

  it("ResumeRepository: setActive enforces at most one published resume per student (feature 27d)", async () => {
    const repo = new ResumeRepository(async () =>
      db.collection<ResumeDocument>("resumes"),
    );

    const first = await repo.create({
      studentId: "student-versioning",
      label: "V1",
      fileKey: "k1",
      originalName: "v1.pdf",
    });
    await repo.setActive(first._id, "student-versioning");
    const second = await repo.create({
      studentId: "student-versioning",
      label: "V2",
      fileKey: "k2",
      originalName: "v2.pdf",
    });
    await repo.setActive(second._id, "student-versioning");

    expect((await repo.get(first._id))?.isActive).toBe(false);
    expect((await repo.get(second._id))?.isActive).toBe(true);
    expect(await repo.listByStudent("student-versioning")).toHaveLength(2);
    expect((await repo.getActiveByStudent("student-versioning"))?._id).toBe(second._id);
  });

  it("StudentProfileRepository: save deactivates the prior active profile", async () => {
    const repo = new StudentProfileRepository(async () =>
      db.collection<StudentProfileDocument>("studentProfiles"),
    );
    const base = {
      studentId: "student-2",
      resumeId: "resume-1",
      isActive: true,
      education: [],
      skills: [],
      experience: [],
      projects: [],
      certifications: [],
      achievements: [],
      coursework: [],
      languages: [],
      totalExperienceMonths: 0,
      profileVersion: 1,
      extractionMetadata: { model: "gemini", promptVersion: "v1", extractedAt: new Date() },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const first = await repo.save(base, { markActive: true });
    const second = await repo.save({ ...base, resumeId: "resume-2" }, { markActive: true });

    const active = await repo.getActiveByStudent("student-2");
    expect(active?._id).toBe(second._id);
    expect(active?.resumeId).toBe("resume-2");

    const all = await repo.listAllActive();
    expect(all.find((p) => p._id === first._id)).toBeUndefined();
  });

  it("JobRepository: create, publish/clear published run, archive", async () => {
    const repo = new JobRepository(async () => db.collection<JobDocument>("jobs"));

    const job = await repo.create({
      title: "Software Engineer Intern",
      fileKey: "jds/jd1.pdf",
      createdBy: "admin-1",
    });
    expect(job.publishedMatchRunId).toBeNull();

    await repo.setPublishedRun(job._id, "run-1");
    expect((await repo.get(job._id))?.publishedMatchRunId).toBe("run-1");

    await repo.clearPublishedRun(job._id);
    expect((await repo.get(job._id))?.publishedMatchRunId).toBeNull();

    await repo.archive(job._id);
    expect((await repo.get(job._id))?.archived).toBe(true);
    expect(await repo.list({ archived: true })).toHaveLength(1);
  });

  it("JobProfileRepository: save then getByJobId", async () => {
    const repo = new JobProfileRepository(async () =>
      db.collection<JobProfileDocument>("jobProfiles"),
    );

    const profile = await repo.save({
      jobId: "job-1",
      title: "Software Engineer Intern",
      requiredSkills: [],
      preferredSkills: [],
      responsibilities: [],
      constraints: [],
      semanticRequirements: [],
      profileVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect((await repo.getByJobId("job-1"))?._id).toBe(profile._id);
  });

  it("ProcessingJobRepository: create, updateStatus, get", async () => {
    const repo = new ProcessingJobRepository(async () =>
      db.collection<ProcessingJobDocument>("processingJobs"),
    );

    const job = await repo.create({ type: "RESUME_PROCESS", targetId: "resume-1" });
    expect(job.status).toBe("QUEUED");

    await repo.updateStatus(job._id, "FAILED", { code: "NEEDS_OCR", message: "bad scan" });
    const updated = await repo.get(job._id);
    expect(updated?.status).toBe("FAILED");
    expect(updated?.error?.code).toBe("NEEDS_OCR");
  });
});
