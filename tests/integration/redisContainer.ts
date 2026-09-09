import { execFile } from "node:child_process";
import { promisify } from "node:util";
import IORedis from "ioredis";

const exec = promisify(execFile);

/** Real Redis integration test fixture via Docker (buildPlan.md §93 exception). */
export async function startRedisContainer(): Promise<{
  url: string;
  stop: () => Promise<void>;
}> {
  const { stdout } = await exec("docker", ["run", "--rm", "-d", "-p", "0:6379", "redis:7-alpine"]);
  const containerId = stdout.trim();

  const { stdout: portOutput } = await exec("docker", ["port", containerId, "6379/tcp"]);
  const port = portOutput.trim().split(":").pop();
  const url = `redis://127.0.0.1:${port}`;

  await waitForReady(url);

  return {
    url,
    stop: async () => {
      await exec("docker", ["stop", containerId]);
    },
  };
}

async function waitForReady(url: string, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    const client = new IORedis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    try {
      await client.connect();
      await client.ping();
      await client.quit();
      return;
    } catch (error) {
      lastError = error;
      client.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error(`Redis container did not become ready in time: ${String(lastError)}`);
}
