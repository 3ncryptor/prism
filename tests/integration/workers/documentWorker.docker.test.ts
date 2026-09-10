import fs from "node:fs";
import path from "node:path";
import type { Db, MongoClient } from "mongodb";
import { ResumeRepository, type ResumeDocument } from "@/lib/db/repositories/resumeRepository";
import { uploadFile, resetS3ClientForTests } from "@/lib/storage/s3Client";
import { enqueueDocumentProcessing } from "@/lib/services/queueService";
import { resetDocumentProcessingQueueForTests, getDocumentProcessingQueue } from "@/lib/queue/queues";
import { resetRedisConnectionForTests, closeRedisConnection } from "@/lib/queue/connection";
import { closeMongoConnection } from "@/lib/db/client";
import { startDocumentWorker } from "@/workers/document-worker";
import type { Worker } from "bullmq";
import { startMongoContainer } from "../mongoContainer";
import { startMinioContainer } from "../minioContainer";
import { startRedisContainer } from "../redisContainer";

/**
 * Full end-to-end: real Mongo + real S3 (MinIO) + real Redis/BullMQ +
 * the real document-worker consuming a real queued job. Uses the DOCX path
 * (mammoth) rather than PDF — pdfjs-dist's internal dynamic import() for
 * its Node worker fallback isn't supported under Jest's CJS transform
 * without --experimental-vm-modules; see
 * docs/agent-artifacts/07-resume-worker/qa-report.md. The PDF branch is
 * covered by tests/unit/workers/documentWorker.test.ts (mocked) and was
 * manually verified against real pdf-parse outside Jest.
 *
 * This exercises the FAILED/NEEDS_OCR path specifically: every .docx
 * fixture mammoth ships (for its own formatting-feature tests) is too
 * short to pass the quality gate, and hand-rolling a full valid OOXML ZIP
 * with enough real text isn't worth the engineering risk for this one
 * test. The EXTRACTED (quality-pass) path is covered by
 * tests/unit/workers/documentWorker.test.ts (mocked extraction) and
 * tests/unit/extract/docxExtractor.test.ts (real mammoth, real fixture).
 */
describe("document-worker (real Mongo + S3 + Redis end-to-end)", () => {
  let stopMongo: () => Promise<void>;
  let stopMinio: () => Promise<void>;
  let stopRedis: () => Promise<void>;
  let db: Db;
  let client: MongoClient;
  let resumeRepo: ResumeRepository;
  let worker: Worker;

  beforeAll(async () => {
    const mongo = await startMongoContainer();
    stopMongo = mongo.stop;
    client = mongo.client;
    db = client.db("prism-test");
    resumeRepo = new ResumeRepository(async () => db.collection<ResumeDocument>("resumes"));
    // The worker uses the default `resumeRepository` singleton, backed by
    // lib/db/client.ts's own connection — point it at this same container.
    process.env.MONGODB_URI = `${mongo.uri}/prism-test?directConnection=true`;

    const minio = await startMinioContainer();
    stopMinio = minio.stop;
    process.env.S3_ENDPOINT = minio.endpoint;
    process.env.S3_BUCKET = minio.bucket;
    process.env.S3_ACCESS_KEY = minio.accessKey;
    process.env.S3_SECRET_KEY = minio.secretKey;
    resetS3ClientForTests();

    const redis = await startRedisContainer();
    stopRedis = redis.stop;
    process.env.REDIS_URL = redis.url;
    resetRedisConnectionForTests();
    resetDocumentProcessingQueueForTests();

    worker = startDocumentWorker();
  }, 120_000);

  afterAll(async () => {
    await worker.close();
    await getDocumentProcessingQueue().close();
    await closeRedisConnection();
    await closeMongoConnection();
    await client.close();
    await Promise.all([stopMongo(), stopMinio(), stopRedis()]);
  }, 60_000);

  it("processes a real queued job end-to-end: UPLOADED -> EXTRACTING -> FAILED (NEEDS_OCR)", async () => {
    const fixturePath = path.join(
      process.cwd(),
      "node_modules/mammoth/test/test-data/underline.docx",
    );
    const fileBuffer = fs.readFileSync(fixturePath);
    const fileKey = "resumes/student-e2e/resume-e2e/original.docx";
    await uploadFile(fileKey, fileBuffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    const resume = await resumeRepo.create({
      studentId: "student-e2e",
      label: "E2E Resume",
      jobRole: null,
      fileKey,
      originalName: "resume.docx",
    });
    expect(resume.status).toBe("UPLOADED");

    await enqueueDocumentProcessing({ type: "RESUME_PROCESS", resumeId: resume._id });

    const finalStatus = await pollForStatus(resumeRepo, resume._id, ["EXTRACTED", "FAILED"]);

    expect(finalStatus).toBe("FAILED");
    const failed = await resumeRepo.get(resume._id);
    expect(failed?.error?.code).toBe("NEEDS_OCR");
  }, 30_000);
});

async function pollForStatus(
  repo: ResumeRepository,
  resumeId: string,
  terminalStatuses: string[],
  timeoutMs = 20_000,
): Promise<string | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const resume = await repo.get(resumeId);
    if (resume && terminalStatuses.includes(resume.status)) {
      return resume.status;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Resume ${resumeId} did not reach a terminal status in time`);
}
