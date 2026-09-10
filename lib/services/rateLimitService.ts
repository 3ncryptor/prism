import { checkTokenBucket } from "@/lib/services/rateLimit/tokenBucket";
import { checkSlidingWindowLog } from "@/lib/services/rateLimit/slidingWindowLog";

export { RateLimitExceededError } from "@/lib/services/rateLimit/errors";

/**
 * Per-endpoint rate limiting, one algorithm per access pattern rather than
 * one flat fixed-window limiter everywhere — a single generic limiter
 * either lets real abuse through or blocks legitimate bursty use, depending
 * which way you tune it.
 *
 * - Resume/JD uploads: token bucket. Usage is legitimately bursty (tagging
 *   resumes for several roles in one sitting; bulk-importing JDs at the
 *   start of a hiring season) — a burst up to `capacity` is let straight
 *   through, then throttled to a steady sustained rate. BullMQ's own worker
 *   concurrency (document-processing: 3, matching: 2) already smooths the
 *   resulting queue ingestion downstream, so this layer doesn't need to.
 * - Match run: NOT primarily a rate limiter — see checkMatchRunBurstLimit.
 * - Forgot password: sliding window log, checked per-email AND per-IP. More
 *   precise than a fixed window (no boundary double-burst) for a low-volume,
 *   security-sensitive endpoint, and atomic (single Lua round trip) so it
 *   can't get stuck locked-out-forever the way a non-atomic INCR+EXPIRE
 *   pair could if the process died between the two calls.
 */

/** docs/screens.md §4.6 (feature 27d): multi-resume upload, one per job role. */
export async function checkResumeUploadLimit(studentId: string): Promise<void> {
  await checkTokenBucket({
    key: `ratelimit:resume-upload:${studentId}`,
    capacity: 8,
    refillRatePerSecond: 1 / 300, // 1 token per 5 min → ~12/hour sustained
  });
}

export async function checkJdUploadLimit(adminId: string): Promise<void> {
  await checkTokenBucket({
    key: `ratelimit:jd-upload:${adminId}`,
    capacity: 15,
    refillRatePerSecond: 1 / 180, // 1 token per 3 min → ~20/hour sustained
  });
}

/**
 * Secondary safety net only — the primary protection against duplicate,
 * expensive match runs is matchingService.startMatchRun()'s own check
 * against MatchRun.status (MatchRunAlreadyInProgressError: only one
 * QUEUED/RUNNING run per job at a time). That's a concurrency guard on a
 * *resource* (the job), not a request-count limit, so it belongs in the
 * domain service, not here. This token bucket exists only to stop a
 * runaway client (e.g. a stuck retry loop) from queuing match runs across
 * many *different* jobs in rapid succession — generous enough that it
 * never fires during normal admin use.
 */
export async function checkMatchRunBurstLimit(adminId: string): Promise<void> {
  await checkTokenBucket({
    key: `ratelimit:match-run-burst:${adminId}`,
    capacity: 10,
    refillRatePerSecond: 1 / 6, // ~10/min sustained
  });
}

/** docs/screens.md §4.3 (feature 27g). */
export async function checkForgotPasswordLimit(email: string, ipAddress: string): Promise<void> {
  await checkSlidingWindowLog({
    key: `ratelimit:forgot-password:email:${email.toLowerCase()}`,
    limit: 3,
    windowSeconds: 600,
  });
  await checkSlidingWindowLog({
    key: `ratelimit:forgot-password:ip:${ipAddress}`,
    limit: 20,
    windowSeconds: 3600,
  });
}
