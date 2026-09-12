import {
  startMatchRun,
  JobNotFoundError,
  JobNotReadyError,
  JobNotLiveError,
  NoActiveScoringConfigError,
  MatchRunAlreadyInProgressError,
} from "@/lib/services/matchingService";
import type { Job } from "@/lib/schemas/job";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    _id: "job-1",
    title: "Backend Engineer",
    fileKey: "jobs/job-1/original.pdf",
    createdBy: "admin-1",
    status: "READY",
    archived: false,
    publishedMatchRunId: null,
    publishedAt: null,
    listingStatus: "LIVE",
    leaderboardSize: 10,
    jobRole: "data science",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeScoringConfig(): ScoringConfig {
  return {
    _id: "config-1",
    version: "scoring-v1",
    isActive: true,
    weights: { hardRequirements: 0.25, skills: 0.3, experience: 0.15, projects: 0.15, education: 0.1, other: 0.05 },
    buckets: { bestFit: 80, moderateFit: 60 },
    semanticThresholds: { strong: 0.85, possible: 0.75, weak: 0.55 },
    mandatoryPenalty: 0.75,
    createdBy: "admin-1",
    createdAt: new Date(),
  };
}

function baseDeps() {
  return {
    jobs: { get: jest.fn().mockResolvedValue(makeJob()) },
    matchRuns: {
      create: jest.fn().mockResolvedValue({ _id: "run-1" }),
      findActiveByJobId: jest.fn().mockResolvedValue(null),
    },
    scoringConfigs: { getActive: jest.fn().mockResolvedValue(makeScoringConfig()) },
    enqueueMatchJob: jest.fn().mockResolvedValue(undefined),
  };
}

function makeDeps(overrides: Partial<ReturnType<typeof baseDeps>> = {}) {
  return { ...baseDeps(), ...overrides };
}

describe("startMatchRun", () => {
  it("throws JobNotFoundError when the job doesn't exist", async () => {
    const deps = makeDeps({ jobs: { get: jest.fn().mockResolvedValue(null) } });
    await expect(startMatchRun("missing", deps)).rejects.toThrow(JobNotFoundError);
  });

  it("throws JobNotReadyError when the job hasn't finished processing", async () => {
    const deps = makeDeps({ jobs: { get: jest.fn().mockResolvedValue(makeJob({ status: "STRUCTURING" })) } });
    await expect(startMatchRun("job-1", deps)).rejects.toThrow(JobNotReadyError);
  });

  it("throws JobNotLiveError when the listing is still Draft", async () => {
    const deps = makeDeps({ jobs: { get: jest.fn().mockResolvedValue(makeJob({ listingStatus: "DRAFT" })) } });
    await expect(startMatchRun("job-1", deps)).rejects.toThrow(JobNotLiveError);
  });

  it("throws NoActiveScoringConfigError when no scoring config is active", async () => {
    const deps = makeDeps({ scoringConfigs: { getActive: jest.fn().mockResolvedValue(null) } });
    await expect(startMatchRun("job-1", deps)).rejects.toThrow(NoActiveScoringConfigError);
  });

  it("creates a match run pinned to the currently active scoring config version and enqueues MATCH_JOB", async () => {
    const deps = makeDeps();

    const result = await startMatchRun("job-1", deps);

    expect(deps.matchRuns.create).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "job-1", scoringConfigVersion: "scoring-v1" }),
    );
    expect(deps.enqueueMatchJob).toHaveBeenCalledWith({ type: "MATCH_JOB", matchRunId: "run-1" });
    expect(result).toEqual({ matchRunId: "run-1" });
  });

  it("throws MatchRunAlreadyInProgressError when a QUEUED/RUNNING run already exists for this job", async () => {
    const deps = makeDeps({
      matchRuns: {
        create: jest.fn(),
        findActiveByJobId: jest.fn().mockResolvedValue({ _id: "run-existing", status: "RUNNING" }),
      },
    });

    await expect(startMatchRun("job-1", deps)).rejects.toThrow(MatchRunAlreadyInProgressError);
    expect(deps.matchRuns.create).not.toHaveBeenCalled();
    expect(deps.enqueueMatchJob).not.toHaveBeenCalled();
  });

  it("passes a staleness cutoff to findActiveByJobId so a hard-killed worker can't block a job forever", async () => {
    const deps = makeDeps();

    await startMatchRun("job-1", deps);

    expect(deps.matchRuns.findActiveByJobId).toHaveBeenCalledWith("job-1", expect.any(Date));
    const [, notBefore] = deps.matchRuns.findActiveByJobId.mock.calls[0];
    expect(notBefore.getTime()).toBeLessThan(Date.now());
  });
});
