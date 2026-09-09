import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const ACCESS_KEY = "test-access-key";
const SECRET_KEY = "test-secret-key-12345";
const BUCKET = "test-bucket";

/**
 * Real S3-API integration test fixture via a MinIO Docker container
 * (buildPlan.md §93 exception, same pattern as tests/integration/mongoContainer.ts).
 */
export async function startMinioContainer(): Promise<{
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  stop: () => Promise<void>;
}> {
  const { stdout } = await exec("docker", [
    "run",
    "--rm",
    "-d",
    "-p",
    "0:9000",
    "-e",
    `MINIO_ROOT_USER=${ACCESS_KEY}`,
    "-e",
    `MINIO_ROOT_PASSWORD=${SECRET_KEY}`,
    "minio/minio",
    "server",
    "/data",
  ]);
  const containerId = stdout.trim();

  const { stdout: portOutput } = await exec("docker", ["port", containerId, "9000/tcp"]);
  const port = portOutput.trim().split(":").pop();
  const endpoint = `http://127.0.0.1:${port}`;

  await waitForReady(endpoint);
  await createBucket(containerId);

  return {
    endpoint,
    accessKey: ACCESS_KEY,
    secretKey: SECRET_KEY,
    bucket: BUCKET,
    stop: async () => {
      await exec("docker", ["stop", containerId]);
    },
  };
}

async function waitForReady(endpoint: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${endpoint}/minio/health/live`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("MinIO container did not become ready in time");
}

async function createBucket(containerId: string): Promise<void> {
  // mc (MinIO client) ships inside the official image.
  await exec("docker", [
    "exec",
    containerId,
    "sh",
    "-c",
    `mc alias set local http://localhost:9000 ${ACCESS_KEY} ${SECRET_KEY} && mc mb local/${BUCKET}`,
  ]);
}
