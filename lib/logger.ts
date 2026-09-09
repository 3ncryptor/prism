import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Structured logger (buildPlan.md §79). Callers must attach requestId/jobId
 * and studentId (only where the caller is authorized to see it) via
 * `logger.child({...})` — never log full resume/JD text bodies.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      }
    : undefined,
});
