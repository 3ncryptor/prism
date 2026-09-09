import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { MongoClient } from "mongodb";

const exec = promisify(execFile);

/**
 * Shared real-MongoDB-via-Docker test fixture (buildPlan.md §93 exception,
 * finalized 2026-09-11). Drives `docker` directly rather than via
 * `testcontainers` — that package's bundled `undici` requires Node >= 22,
 * which this environment doesn't have. Start once per test file with
 * `beforeAll`, reuse across tests in that file, stop in `afterAll`.
 */
export async function startMongoContainer(): Promise<{
  client: MongoClient;
  uri: string;
  stop: () => Promise<void>;
}> {
  const { stdout } = await exec("docker", [
    "run",
    "--rm",
    "-d",
    "-p",
    "0:27017",
    "mongo:7.0",
  ]);
  const containerId = stdout.trim();

  const { stdout: portOutput } = await exec("docker", [
    "port",
    containerId,
    "27017/tcp",
  ]);
  const port = portOutput.trim().split(":").pop();
  const uri = `mongodb://127.0.0.1:${port}`;

  const client = new MongoClient(uri, { directConnection: true });
  await waitForConnection(client);

  return {
    client,
    uri,
    stop: async () => {
      await client.close();
      await exec("docker", ["stop", containerId]);
    },
  };
}

async function waitForConnection(client: MongoClient, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`MongoDB container did not become ready in time: ${String(lastError)}`);
}
