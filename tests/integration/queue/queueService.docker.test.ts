import { enqueueDocumentProcessing } from "@/lib/services/queueService";
import { getDocumentProcessingQueue, resetDocumentProcessingQueueForTests } from "@/lib/queue/queues";
import { resetRedisConnectionForTests, closeRedisConnection } from "@/lib/queue/connection";
import { startRedisContainer } from "../redisContainer";

describe("Queue (real Redis via Docker)", () => {
  let stop: () => Promise<void>;

  beforeAll(async () => {
    const redis = await startRedisContainer();
    stop = redis.stop;
    process.env.REDIS_URL = redis.url;
    resetRedisConnectionForTests();
    resetDocumentProcessingQueueForTests();
  }, 60_000);

  afterAll(async () => {
    await getDocumentProcessingQueue().close();
    await closeRedisConnection();
    await stop();
  }, 30_000);

  it("enqueueDocumentProcessing adds a real job to the BullMQ queue", async () => {
    await enqueueDocumentProcessing({ type: "RESUME_PROCESS", resumeId: "resume-1" });

    const counts = await getDocumentProcessingQueue().getJobCounts("waiting");
    expect(counts.waiting).toBeGreaterThanOrEqual(1);

    const jobs = await getDocumentProcessingQueue().getJobs(["waiting"]);
    const job = jobs.find((j) => j.data.type === "RESUME_PROCESS" && "resumeId" in j.data && j.data.resumeId === "resume-1");
    expect(job).toBeDefined();
    expect(job?.opts.attempts).toBe(3);
  });
});
