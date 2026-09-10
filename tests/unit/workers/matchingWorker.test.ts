import { processMatchRun } from "@/workers/matching-worker";
import type { MatchRun } from "@/lib/schemas/matchRun";
import type { Job } from "@/lib/schemas/job";
import type { JobProfile } from "@/lib/schemas/jobProfile";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import type { StudentProfile } from "@/lib/schemas/studentProfile";

function makeRun(overrides: Partial<MatchRun> = {}): MatchRun {
  return {
    _id: "run-1",
    jobId: "job-1",
    status: "QUEUED",
    scoringConfigVersion: "scoring-v1",
    extractionModelVersion: "gemini-3.6-flash",
    embeddingModelVersion: "gemini-embedding-001",
    candidateCount: 0,
    processedCount: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeJob(): Job {
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeJobProfile(): JobProfile {
  return {
    _id: "jobprofile-1",
    jobId: "job-1",
    title: "Backend Engineer",
    requiredSkills: [],
    preferredSkills: [],
    responsibilities: [],
    constraints: [],
    semanticRequirements: [],
    profileVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeScoringConfig(): ScoringConfig {
  return {
    _id: "config-1",
    version: "scoring-v1",
    isActive: true,
    weights: { hardRequirements: 0.25, skills: 0.3, experience: 0.15, projects: 0.15, education: 0.1, other: 0.05 },
    buckets: { bestFit: 80, moderateFit: 60 },
    semanticThresholds: { strong: 0.85, possible: 0.75 },
    mandatoryPenalty: 0.75,
    createdBy: "admin-1",
    createdAt: new Date(),
  };
}

function makeStudent(studentId: string): StudentProfile {
  return {
    _id: `profile-${studentId}`,
    studentId,
    resumeId: `resume-${studentId}`,
    isActive: true,
    education: [],
    skills: [],
    experience: [],
    projects: [],
    certifications: [],
    achievements: [],
    coursework: [],
    languages: [],
    totalExperienceMonths: 0,
    profileVersion: 1,
    extractionMetadata: { model: "gemini-3.6-flash", promptVersion: "resume-extraction-v1", extractedAt: new Date() },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function baseDeps() {
  return {
    matchRuns: {
      get: jest.fn().mockResolvedValue(makeRun()),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      setCandidateCount: jest.fn().mockResolvedValue(undefined),
      incrementProcessed: jest.fn().mockResolvedValue(undefined),
      complete: jest.fn().mockResolvedValue(undefined),
    },
    matchResults: {
      upsert: jest.fn().mockResolvedValue(undefined),
    },
    jobs: {
      get: jest.fn().mockResolvedValue(makeJob()),
    },
    jobProfiles: {
      getByJobId: jest.fn().mockResolvedValue(makeJobProfile()),
    },
    scoringConfigs: {
      getByVersion: jest.fn().mockResolvedValue(makeScoringConfig()),
    },
    studentProfiles: {
      listAllActive: jest.fn().mockResolvedValue([makeStudent("student-1"), makeStudent("student-2")]),
    },
    embedJobRequirements: jest.fn().mockResolvedValue([]),
    retrieveEvidenceForStudent: jest.fn().mockResolvedValue(new Map()),
    evaluateMatch: jest.fn().mockReturnValue({
      score: 75,
      confidence: 80,
      bucket: "MODERATE_FIT",
      eligible: true,
      ineligibilityReasons: [],
      categoryScores: { hardRequirements: 100, skills: 100, experience: 100, projects: 100, education: 100, other: 100 },
      evidence: [],
      missingRequirements: [],
    }),
  };
}

function makeDeps(overrides: Partial<ReturnType<typeof baseDeps>> = {}) {
  return { ...baseDeps(), ...overrides };
}

describe("processMatchRun", () => {
  it("throws if the match run does not exist", async () => {
    const deps = makeDeps({ matchRuns: { ...baseDeps().matchRuns, get: jest.fn().mockResolvedValue(null) } });
    await expect(processMatchRun("missing", deps)).rejects.toThrow(/not found/);
  });

  it("runs the full pipeline: RUNNING -> per-student evaluate+upsert -> COMPLETED", async () => {
    const deps = makeDeps();

    await processMatchRun("run-1", deps);

    expect(deps.matchRuns.setCandidateCount).toHaveBeenCalledWith("run-1", 2);
    expect(deps.matchRuns.updateStatus).toHaveBeenCalledWith("run-1", "RUNNING");
    expect(deps.evaluateMatch).toHaveBeenCalledTimes(2);
    expect(deps.matchResults.upsert).toHaveBeenCalledTimes(2);
    expect(deps.matchRuns.incrementProcessed).toHaveBeenCalledTimes(2);
    expect(deps.matchRuns.complete).toHaveBeenCalledWith("run-1");
  });

  it("fetches the scoring config by the version pinned on the run, not the active one", async () => {
    const deps = makeDeps();
    await processMatchRun("run-1", deps);
    expect(deps.scoringConfigs.getByVersion).toHaveBeenCalledWith("scoring-v1");
  });

  it("marks the run FAILED and rethrows on an unexpected error", async () => {
    const deps = makeDeps({
      studentProfiles: { listAllActive: jest.fn().mockRejectedValue(new Error("Mongo down")) },
    });

    await expect(processMatchRun("run-1", deps)).rejects.toThrow("Mongo down");

    expect(deps.matchRuns.updateStatus).toHaveBeenCalledWith("run-1", "FAILED", {
      code: "MATCH_RUN_ERROR",
      message: "Mongo down",
    });
  });

  it("upserts a result with the run's pinned model versions, not any dynamic value", async () => {
    const deps = makeDeps({ studentProfiles: { listAllActive: jest.fn().mockResolvedValue([makeStudent("student-1")]) } });
    await processMatchRun("run-1", deps);
    expect(deps.matchResults.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        modelVersions: { extraction: "gemini-3.6-flash", embedding: "gemini-embedding-001" },
        scoringConfigVersion: "scoring-v1",
      }),
    );
  });
});
