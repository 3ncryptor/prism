import type { Logger } from "pino";
import { withTiming } from "@/lib/observability/timing";

function makeFakeLogger() {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;
}

describe("withTiming", () => {
  it("logs at info level with operation and durationMs on success, and returns the result", async () => {
    const log = makeFakeLogger();

    const result = await withTiming(log, "test.operation", async () => "ok");

    expect(result).toBe("ok");
    expect(log.info).toHaveBeenCalledTimes(1);
    const [fields, message] = (log.info as jest.Mock).mock.calls[0];
    expect(fields.operation).toBe("test.operation");
    expect(typeof fields.durationMs).toBe("number");
    expect(message).toBe("test.operation completed");
  });

  it("logs at debug level when level: 'debug' is passed", async () => {
    const log = makeFakeLogger();

    await withTiming(log, "test.hot-path", async () => undefined, { level: "debug" });

    expect(log.debug).toHaveBeenCalledTimes(1);
    expect(log.info).not.toHaveBeenCalled();
  });

  it("includes extra fields in the log payload", async () => {
    const log = makeFakeLogger();

    await withTiming(log, "test.operation", async () => undefined, { extra: { namespace: "student-features" } });

    const [fields] = (log.info as jest.Mock).mock.calls[0];
    expect(fields.namespace).toBe("student-features");
  });

  it("logs at error level with durationMs and err, then rethrows on failure", async () => {
    const log = makeFakeLogger();
    const failure = new Error("boom");

    await expect(
      withTiming(log, "test.operation", async () => {
        throw failure;
      }),
    ).rejects.toThrow("boom");

    expect(log.error).toHaveBeenCalledTimes(1);
    const [fields, message] = (log.error as jest.Mock).mock.calls[0];
    expect(fields.operation).toBe("test.operation");
    expect(fields.err).toBe(failure);
    expect(typeof fields.durationMs).toBe("number");
    expect(message).toBe("test.operation failed");
    expect(log.info).not.toHaveBeenCalled();
  });
});
