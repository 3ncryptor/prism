import { matchRunRepository, type MatchRunRepository } from "@/lib/db/repositories/matchRunRepository";
import { scoringConfigRepository, type ScoringConfigRepository } from "@/lib/db/repositories/scoringConfigRepository";
import { jobRepository, type JobRepository } from "@/lib/db/repositories/jobRepository";
import { enqueueMatchJob as defaultEnqueueMatchJob } from "@/lib/services/queueService";
import { GeminiExtractionProvider } from "@/lib/extraction/geminiExtractionProvider";
import { GeminiEmbeddingProvider } from "@/lib/embeddings/geminiEmbeddingProvider";

export class JobNotFoundError extends Error {
  constructor() {
    super("Job not found");
    this.name = "JobNotFoundError";
  }
}

export class JobNotReadyError extends Error {
  constructor() {
    super("Job is not READY yet");
    this.name = "JobNotReadyError";
  }
}

/** docs/screens.md §4.10 (feature 27c): Run Matching is disabled until an admin flips the JD to Live. */
export class JobNotLiveError extends Error {
  constructor() {
    super("Job listing must be Live before matching can run");
    this.name = "JobNotLiveError";
  }
}

export class NoActiveScoringConfigError extends Error {
  constructor() {
    super("No active scoring config found — seed one first");
    this.name = "NoActiveScoringConfigError";
  }
}

/**
 * The real protection against duplicate, expensive match runs for the same
 * job — not a request-rate limit (see rateLimitService.ts's
 * checkMatchRunBurstLimit for the secondary, per-admin safety net). This is
 * a concurrency guard on a *resource* (the job), checked against the
 * durable MatchRun.status already persisted in Mongo rather than a Redis
 * lock, so it needs no separate TTL/lock-expiry machinery of its own.
 */
export class MatchRunAlreadyInProgressError extends Error {
  constructor() {
    super("A match run is already in progress for this job");
    this.name = "MatchRunAlreadyInProgressError";
  }
}

/**
 * A run stuck at QUEUED/RUNNING older than this is treated as abandoned
 * (e.g. its worker process was hard-killed) rather than a real block, so
 * one crashed run can't permanently prevent re-triggering matching for a
 * job. Generous relative to a normal run's expected duration.
 */
const STALE_RUN_AFTER_MS = 20 * 60 * 1000;

type Deps = {
  jobs: Pick<JobRepository, "get">;
  matchRuns: Pick<MatchRunRepository, "create" | "findActiveByJobId">;
  scoringConfigs: Pick<ScoringConfigRepository, "getActive">;
  enqueueMatchJob: typeof defaultEnqueueMatchJob;
};

const defaultDeps: Deps = {
  jobs: jobRepository,
  matchRuns: matchRunRepository,
  scoringConfigs: scoringConfigRepository,
  enqueueMatchJob: defaultEnqueueMatchJob,
};

/**
 * BACKEND_ARCHITECTURE.md §0.4/§5: resolves + pins the active ScoringConfig
 * and current extraction/embedding model ids onto the MatchRun at creation
 * time — the worker later fetches *this specific version*, never
 * "whatever's active right now", so an admin activating a new config
 * mid-run can't make the run internally inconsistent (determinism,
 * buildPlan.md §108 Principle 1).
 */
export async function startMatchRun(
  jobId: string,
  deps: Deps = defaultDeps,
): Promise<{ matchRunId: string }> {
  const job = await deps.jobs.get(jobId);
  if (!job) throw new JobNotFoundError();
  if (job.status !== "READY") throw new JobNotReadyError();
  if (job.listingStatus !== "LIVE") throw new JobNotLiveError();

  const staleCutoff = new Date(Date.now() - STALE_RUN_AFTER_MS);
  const activeRun = await deps.matchRuns.findActiveByJobId(jobId, staleCutoff);
  if (activeRun) throw new MatchRunAlreadyInProgressError();

  const scoringConfig = await deps.scoringConfigs.getActive();
  if (!scoringConfig) throw new NoActiveScoringConfigError();

  const extractionModelVersion = new GeminiExtractionProvider().modelId;
  const embeddingModelVersion = new GeminiEmbeddingProvider().modelId;

  const run = await deps.matchRuns.create({
    jobId,
    scoringConfigVersion: scoringConfig.version,
    extractionModelVersion,
    embeddingModelVersion,
  });

  await deps.enqueueMatchJob({ type: "MATCH_JOB", matchRunId: run._id });

  return { matchRunId: run._id };
}
