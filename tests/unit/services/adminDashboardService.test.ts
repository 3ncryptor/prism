import { getAdminDashboardData } from "@/lib/services/adminDashboardService";
import type { Job } from "@/lib/schemas/job";
import type { MatchRun } from "@/lib/schemas/matchRun";
import type { MatchResult } from "@/lib/schemas/matchResult";
import type { JobRoleTaxonomyEntry } from "@/lib/schemas/jobRoleTaxonomy";
import type { AuditLog } from "@/lib/schemas/auditLog";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    _id: "job-1",
    title: "ML Engineer",
    company: "DataCorp",
    fileKey: "jobs/job-1/original.pdf",
    createdBy: "admin-1",
    status: "READY",
    archived: false,
    publishedMatchRunId: null,
    publishedAt: null,
    listingStatus: "LIVE",
    leaderboardSize: 10,
    jobRole: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRun(overrides: Partial<MatchRun> = {}): MatchRun {
  return {
    _id: "run-1",
    jobId: "job-1",
    status: "COMPLETED",
    scoringConfigVersion: "v1",
    extractionModelVersion: "gemini-1",
    embeddingModelVersion: "gemini-1",
    candidateCount: 10,
    processedCount: 10,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeResult(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    _id: "result-1",
    matchRunId: "run-1",
    studentId: "student-1",
    jobId: "job-1",
    resumeId: "resume-1",
    score: 80,
    bucket: "BEST_FIT",
    confidence: 0.9,
    eligible: true,
    ineligibilityReasons: [],
    categoryScores: { hardRequirements: 1, skills: 1, experience: 1, projects: 1, education: 1, other: 1 },
    evidence: [],
    missingRequirements: [],
    scoringConfigVersion: "v1",
    modelVersions: { extraction: "gemini-1", embedding: "gemini-1" },
    createdAt: new Date(),
    ...overrides,
  };
}

function makeRole(overrides: Partial<JobRoleTaxonomyEntry> = {}): JobRoleTaxonomyEntry {
  return {
    _id: "role-1",
    canonicalName: "data science",
    displayName: "Data Science",
    isActive: true,
    createdBy: "admin-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    _id: "log-1",
    actorId: "admin-1",
    actorRole: "ADMIN",
    action: "job.match.start",
    targetType: "job",
    targetId: "job-1",
    createdAt: new Date(),
    ...overrides,
  };
}

function baseDeps() {
  return {
    jobs: { list: jest.fn().mockResolvedValue([]) },
    matchRuns: { listByJob: jest.fn().mockResolvedValue([]) },
    matchResults: { listByRun: jest.fn().mockResolvedValue([]) },
    jobRoles: { listActive: jest.fn().mockResolvedValue([]) },
    resumes: { countActiveByRole: jest.fn().mockResolvedValue(0) },
    auditLogs: { listRecent: jest.fn().mockResolvedValue([]) },
  };
}

function makeDeps(overrides: Partial<ReturnType<typeof baseDeps>> = {}) {
  return { ...baseDeps(), ...overrides };
}

describe("getAdminDashboardData", () => {
  it("computes pipeline overview counts from listing status and pipeline status", async () => {
    const deps = makeDeps({
      jobs: {
        list: jest.fn().mockResolvedValue([
          makeJob({ _id: "j1", listingStatus: "LIVE", status: "READY" }),
          makeJob({ _id: "j2", listingStatus: "DRAFT", status: "READY" }),
          makeJob({ _id: "j3", listingStatus: "LIVE", status: "EXTRACTING" }),
          makeJob({ _id: "j4", listingStatus: "LIVE", status: "FAILED" }),
        ]),
      },
    });

    const result = await getAdminDashboardData(deps);

    expect(result.pipeline).toEqual({ live: 3, draft: 1, ready: 2, processing: 1 });
  });

  it("flags a Ready+Live job with no match run as needing attention", async () => {
    const deps = makeDeps({
      jobs: { list: jest.fn().mockResolvedValue([makeJob({ _id: "j1", status: "READY", listingStatus: "LIVE" })]) },
      matchRuns: { listByJob: jest.fn().mockResolvedValue([]) },
    });

    const result = await getAdminDashboardData(deps);

    expect(result.needsAttention).toEqual([
      { jobId: "j1", title: "ML Engineer", company: "DataCorp", reason: "no_run", latestRunAt: null },
    ]);
  });

  it("flags a Ready+Live job whose latest run is older than the staleness cutoff", async () => {
    const staleDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const deps = makeDeps({
      jobs: { list: jest.fn().mockResolvedValue([makeJob({ _id: "j1", status: "READY", listingStatus: "LIVE" })]) },
      matchRuns: { listByJob: jest.fn().mockResolvedValue([makeRun({ createdAt: staleDate })]) },
    });

    const result = await getAdminDashboardData(deps);

    expect(result.needsAttention).toEqual([
      { jobId: "j1", title: "ML Engineer", company: "DataCorp", reason: "stale_run", latestRunAt: staleDate },
    ]);
  });

  it("does not flag a job with a recent run, or a Draft/not-Ready job", async () => {
    const deps = makeDeps({
      jobs: {
        list: jest.fn().mockResolvedValue([
          makeJob({ _id: "j1", status: "READY", listingStatus: "LIVE" }),
          makeJob({ _id: "j2", status: "READY", listingStatus: "DRAFT" }),
          makeJob({ _id: "j3", status: "EXTRACTING", listingStatus: "LIVE" }),
        ]),
      },
      matchRuns: { listByJob: jest.fn().mockResolvedValue([makeRun({ createdAt: new Date() })]) },
    });

    const result = await getAdminDashboardData(deps);

    expect(result.needsAttention).toEqual([]);
  });

  it("reports candidate pool health as active resume counts per active role", async () => {
    const deps = makeDeps({
      jobRoles: {
        listActive: jest.fn().mockResolvedValue([
          makeRole({ canonicalName: "data science", displayName: "Data Science" }),
          makeRole({ canonicalName: "design", displayName: "Design" }),
        ]),
      },
      resumes: {
        countActiveByRole: jest.fn().mockImplementation(async (role: string) => (role === "data science" ? 5 : 0)),
      },
    });

    const result = await getAdminDashboardData(deps);

    expect(result.candidatePoolHealth).toEqual([
      { canonicalName: "data science", displayName: "Data Science", activeResumeCount: 5 },
      { canonicalName: "design", displayName: "Design", activeResumeCount: 0 },
    ]);
  });

  it("sums bucket outcomes across every live job's published run only", async () => {
    const deps = makeDeps({
      jobs: {
        list: jest.fn().mockResolvedValue([
          makeJob({ _id: "j1", listingStatus: "LIVE", publishedMatchRunId: "run-1" }),
          makeJob({ _id: "j2", listingStatus: "LIVE", publishedMatchRunId: null }),
          makeJob({ _id: "j3", listingStatus: "DRAFT", publishedMatchRunId: "run-3" }),
        ]),
      },
      matchResults: {
        listByRun: jest.fn().mockImplementation(async (runId: string) => {
          if (runId === "run-1") {
            return [makeResult({ bucket: "BEST_FIT" }), makeResult({ _id: "r2", bucket: "LOW_FIT" })];
          }
          return [];
        }),
      },
    });

    const result = await getAdminDashboardData(deps);

    expect(result.aggregateOutcomes).toEqual({ BEST_FIT: 1, MODERATE_FIT: 0, LOW_FIT: 1 });
  });

  it("passes through recent activity from the audit log", async () => {
    const entries = [makeAuditLog()];
    const deps = makeDeps({ auditLogs: { listRecent: jest.fn().mockResolvedValue(entries) } });

    const result = await getAdminDashboardData(deps);

    expect(result.recentActivity).toBe(entries);
  });
});
