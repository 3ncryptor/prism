import "@/lib/config/loadEnv";
import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import {
  matchRunRepository,
  type MatchRunRepository,
} from "@/lib/db/repositories/matchRunRepository";
import {
  matchResultRepository,
  type MatchResultRepository,
} from "@/lib/db/repositories/matchResultRepository";
import { jobRepository, type JobRepository } from "@/lib/db/repositories/jobRepository";
import {
  jobProfileRepository,
  type JobProfileRepository,
} from "@/lib/db/repositories/jobProfileRepository";
import {
  scoringConfigRepository,
  type ScoringConfigRepository,
} from "@/lib/db/repositories/scoringConfigRepository";
import {
  studentProfileRepository,
  type StudentProfileRepository,
} from "@/lib/db/repositories/studentProfileRepository";
import { embedJobRequirements as defaultEmbedJobRequirements } from "@/lib/services/embeddingService";
import { retrieveEvidenceForStudent as defaultRetrieveEvidenceForStudent } from "@/lib/services/vectorStoreService";
import { evaluateMatch as defaultEvaluateMatch } from "@/lib/matching/matchingEngine";
import type { MatchingJobPayload } from "@/lib/queue/jobTypes";
import { logger } from "@/lib/logger";
import { withTiming } from "@/lib/observability/timing";

type ProcessMatchRunDeps = {
  matchRuns: Pick<MatchRunRepository, "get" | "updateStatus" | "setCandidateCount" | "incrementProcessed" | "complete">;
  matchResults: Pick<MatchResultRepository, "upsert">;
  jobs: Pick<JobRepository, "get">;
  jobProfiles: Pick<JobProfileRepository, "getByJobId">;
  scoringConfigs: Pick<ScoringConfigRepository, "getByVersion">;
  studentProfiles: Pick<StudentProfileRepository, "listAllActive">;
  embedJobRequirements: typeof defaultEmbedJobRequirements;
  retrieveEvidenceForStudent: typeof defaultRetrieveEvidenceForStudent;
  evaluateMatch: typeof defaultEvaluateMatch;
};

const defaultDeps: ProcessMatchRunDeps = {
  matchRuns: matchRunRepository,
  matchResults: matchResultRepository,
  jobs: jobRepository,
  jobProfiles: jobProfileRepository,
  scoringConfigs: scoringConfigRepository,
  studentProfiles: studentProfileRepository,
  embedJobRequirements: defaultEmbedJobRequirements,
  retrieveEvidenceForStudent: defaultRetrieveEvidenceForStudent,
  evaluateMatch: defaultEvaluateMatch,
};

/**
 * BACKEND_ARCHITECTURE.md §7: V1 scores the full active student population
 * (no candidate pre-filter, buildPlan.md §23). Fetches the scoring config
 * by the *version pinned on the run* (§0.4), never getActive() — an admin
 * activating a new config mid-run must not change an in-flight run's
 * results.
 */
export async function processMatchRun(
  matchRunId: string,
  deps: ProcessMatchRunDeps = defaultDeps,
): Promise<void> {
  const run = await deps.matchRuns.get(matchRunId);
  if (!run) {
    throw new Error(`Match run not found: ${matchRunId}`);
  }
  const log = logger.child({ jobId: matchRunId, jobType: "MATCH_RUN" });

  await withTiming(log, "matchRun.process", async () => {
  try {
    const job = await deps.jobs.get(run.jobId);
    if (!job) throw new Error(`Job not found: ${run.jobId}`);

    const jobProfile = await deps.jobProfiles.getByJobId(run.jobId);
    if (!jobProfile) throw new Error(`Job profile not found for job: ${run.jobId}`);

    const config = await deps.scoringConfigs.getByVersion(run.scoringConfigVersion);
    if (!config) throw new Error(`Scoring config not found: ${run.scoringConfigVersion}`);

    const students = await deps.studentProfiles.listAllActive();
    await deps.matchRuns.setCandidateCount(matchRunId, students.length);
    await deps.matchRuns.updateStatus(matchRunId, "RUNNING");

    const requirementVectors = await deps.embedJobRequirements(jobProfile);

    for (const student of students) {
      const retrieval = await deps.retrieveEvidenceForStudent(student.studentId, requirementVectors);
      const evaluation = deps.evaluateMatch(student, jobProfile, config, retrieval);

      await deps.matchResults.upsert({
        matchRunId,
        studentId: student.studentId,
        jobId: run.jobId,
        score: evaluation.score,
        bucket: evaluation.bucket,
        confidence: evaluation.confidence,
        eligible: evaluation.eligible,
        ineligibilityReasons: evaluation.ineligibilityReasons,
        categoryScores: evaluation.categoryScores,
        evidence: evaluation.evidence,
        missingRequirements: evaluation.missingRequirements,
        scoringConfigVersion: run.scoringConfigVersion,
        modelVersions: {
          extraction: run.extractionModelVersion,
          embedding: run.embeddingModelVersion,
        },
        createdAt: new Date(),
      });
      await deps.matchRuns.incrementProcessed(matchRunId);
    }

    await deps.matchRuns.complete(matchRunId);
  } catch (error) {
    await deps.matchRuns.updateStatus(matchRunId, "FAILED", {
      code: "MATCH_RUN_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error; // rethrow so BullMQ retries, per buildPlan.md §57
  }
  });
}

export function startMatchingWorker(): Worker<MatchingJobPayload> {
  const worker = new Worker<MatchingJobPayload>(
    "matching",
    async (job: Job<MatchingJobPayload>) => {
      await processMatchRun(job.data.matchRunId);
    },
    { connection: getRedisConnection(), concurrency: 2 },
  );

  // buildPlan.md §79: terminal (post-retry) worker failures, distinct from
  // the per-run FAILED status already persisted inside processMatchRun.
  worker.on("failed", (job, error) => {
    logger.error(
      { queueJobId: job?.id, matchRunId: job?.data?.matchRunId, attemptsMade: job?.attemptsMade, err: error },
      "Matching job failed",
    );
  });

  return worker;
}

if (require.main === module) {
  const worker = startMatchingWorker();
  logger.info("Matching worker started");

  const shutdown = async () => {
    logger.info("Shutting down matching worker...");
    await worker.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
