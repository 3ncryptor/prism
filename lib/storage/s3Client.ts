import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Config } from "@/lib/config/env";

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const config = getS3Config();
  cachedClient = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: Boolean(config.endpoint), // required for MinIO/R2-style endpoints
    credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
  });
  return cachedClient;
}

/** buildPlan.md §5.1 path convention. */
export function buildResumeKey(studentId: string, resumeId: string, extension: string): string {
  return `resumes/${studentId}/${resumeId}/original.${extension}`;
}

export function buildJobKey(jobId: string, extension: string): string {
  return `jds/${jobId}/original.${extension}`;
}

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const { bucket } = getS3Config();
  await getClient().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
}

export async function downloadFile(key: string): Promise<Buffer> {
  const { bucket } = getS3Config();
  const result = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) {
    throw new Error(`No content returned for S3 key: ${key}`);
  }
  return Buffer.from(bytes);
}

/** buildPlan.md §80: never expose a public/permanent URL to a resume/JD file. */
export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { bucket } = getS3Config();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}

/** Test-only escape hatch to force a fresh client against a different endpoint. */
export function resetS3ClientForTests(): void {
  cachedClient = null;
}
