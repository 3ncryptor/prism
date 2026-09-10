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

type Deps = {
  jobs: Pick<JobRepository, "get">;
  matchRuns: Pick<MatchRunRepository, "create">;
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
