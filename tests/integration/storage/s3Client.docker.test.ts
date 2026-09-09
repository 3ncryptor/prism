import {
  uploadFile,
  downloadFile,
  getPresignedDownloadUrl,
  buildResumeKey,
  buildJobKey,
  resetS3ClientForTests,
} from "@/lib/storage/s3Client";
import { startMinioContainer } from "../minioContainer";

describe("s3Client (real S3 API via MinIO Docker)", () => {
  let stop: () => Promise<void>;

  beforeAll(async () => {
    const minio = await startMinioContainer();
    stop = minio.stop;
    process.env.S3_ENDPOINT = minio.endpoint;
    process.env.S3_BUCKET = minio.bucket;
    process.env.S3_ACCESS_KEY = minio.accessKey;
    process.env.S3_SECRET_KEY = minio.secretKey;
    resetS3ClientForTests();
  }, 60_000);

  afterAll(async () => {
    await stop();
  }, 30_000);

  it("buildResumeKey/buildJobKey match buildPlan.md §5.1's convention", () => {
    expect(buildResumeKey("student-1", "resume-1", "pdf")).toBe(
      "resumes/student-1/resume-1/original.pdf",
    );
    expect(buildJobKey("job-1", "docx")).toBe("jds/job-1/original.docx");
  });

  it("uploadFile then downloadFile round-trips the same bytes", async () => {
    const key = buildResumeKey("student-2", "resume-2", "pdf");
    const content = Buffer.from("%PDF-1.4 fake resume content");

    await uploadFile(key, content, "application/pdf");
    const downloaded = await downloadFile(key);

    expect(downloaded.equals(content)).toBe(true);
  });

  it("getPresignedDownloadUrl returns a URL that actually fetches the content", async () => {
    const key = buildResumeKey("student-3", "resume-3", "pdf");
    const content = Buffer.from("presigned url test content");
    await uploadFile(key, content, "application/pdf");

    const url = await getPresignedDownloadUrl(key, 60);
    const response = await fetch(url);
    const body = Buffer.from(await response.arrayBuffer());

    expect(response.ok).toBe(true);
    expect(body.equals(content)).toBe(true);
  });
});
