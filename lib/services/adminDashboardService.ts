import { jobRepository, type JobRepository } from "@/lib/db/repositories/jobRepository";
import { matchRunRepository, type MatchRunRepository } from "@/lib/db/repositories/matchRunRepository";
import { matchResultRepository, type MatchResultRepository } from "@/lib/db/repositories/matchResultRepository";
import {
  jobRoleTaxonomyRepository,
  type JobRoleTaxonomyRepository,
} from "@/lib/db/repositories/jobRoleTaxonomyRepository";
import { resumeRepository, type ResumeRepository } from "@/lib/db/repositories/resumeRepository";
import { auditLogRepository, type AuditLogRepository } from "@/lib/db/repositories/auditLogRepository";
import type { AuditLog } from "@/lib/schemas/auditLog";
import type { FitBucket } from "@/lib/matching/types";

export interface NeedsAttentionJob {
  jobId: string;
  title: string;
  company?: string;
  reason: "no_run" | "stale_run";
  latestRunAt: Date | null;
}

export interface PipelineOverview {
  live: number;
  draft: number;
  ready: number;
  processing: number;
}

export interface RoleCoverageCount {
  canonicalName: string;
  displayName: string;
  activeResumeCount: number;
}

export interface AdminDashboardData {
  needsAttention: NeedsAttentionJob[];
  pipeline: PipelineOverview;
  candidatePoolHealth: RoleCoverageCount[];
  aggregateOutcomes: Record<FitBucket, number>;
  recentActivity: AuditLog[];
}

type Deps = {
  jobs: Pick<JobRepository, "list">;
  matchRuns: Pick<MatchRunRepository, "listByJob">;
  matchResults: Pick<MatchResultRepository, "listByRun">;
  jobRoles: Pick<JobRoleTaxonomyRepository, "listActive">;
  resumes: Pick<ResumeRepository, "countActiveByRole">;
  auditLogs: Pick<AuditLogRepository, "listRecent">;
};

const defaultDeps: Deps = {
  jobs: jobRepository,
  matchRuns: matchRunRepository,
  matchResults: matchResultRepository,
  jobRoles: jobRoleTaxonomyRepository,
  resumes: resumeRepository,
  auditLogs: auditLogRepository,
};

const STALE_RUN_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_ACTIVITY_LIMIT = 10;

/**
 * docs/screens.md §8.7 (feature 27n). Backs the new /admin dashboard —
 * the admin's previous landing page (the Jobs list) moves to /admin/jobs.
 * Non-archived jobs only: an archived job is retired and shouldn't surface
 * in "needs attention" or count toward pipeline/outcome totals.
 */
export async function getAdminDashboardData(deps: Deps = defaultDeps): Promise<AdminDashboardData> {
  const [jobs, activeRoles, recentActivity] = await Promise.all([
    deps.jobs.list({ archived: false }),
    deps.jobRoles.listActive(),
    deps.auditLogs.listRecent(RECENT_ACTIVITY_LIMIT),
  ]);

  const pipeline: PipelineOverview = { live: 0, draft: 0, ready: 0, processing: 0 };
  for (const job of jobs) {
    if (job.listingStatus === "LIVE") pipeline.live += 1;
    else pipeline.draft += 1;
    if (job.status === "READY") pipeline.ready += 1;
    else if (job.status !== "FAILED") pipeline.processing += 1;
  }

  const staleCutoff = new Date(Date.now() - STALE_RUN_MS);
  const needsAttention: NeedsAttentionJob[] = [];
  for (const job of jobs) {
    if (job.status !== "READY" || job.listingStatus !== "LIVE") continue;
    const runs = await deps.matchRuns.listByJob(job._id);
    const latestRun = runs[0] ?? null;
    if (!latestRun) {
      needsAttention.push({ jobId: job._id, title: job.title, company: job.company, reason: "no_run", latestRunAt: null });
    } else if (latestRun.createdAt < staleCutoff) {
      needsAttention.push({
        jobId: job._id,
        title: job.title,
        company: job.company,
        reason: "stale_run",
        latestRunAt: latestRun.createdAt,
      });
    }
  }

  const candidatePoolHealth: RoleCoverageCount[] = await Promise.all(
    activeRoles.map(async (role) => ({
      canonicalName: role.canonicalName,
      displayName: role.displayName,
      activeResumeCount: await deps.resumes.countActiveByRole(role.canonicalName),
    })),
  );

  const aggregateOutcomes: Record<FitBucket, number> = { BEST_FIT: 0, MODERATE_FIT: 0, LOW_FIT: 0 };
  const liveJobsWithPublishedRun = jobs.filter((job) => job.listingStatus === "LIVE" && job.publishedMatchRunId);
  for (const job of liveJobsWithPublishedRun) {
    // includeIneligible: true — this is the admin's own operational view
    // of how a published run actually scored (distinct from the
    // student-facing leaderboard, which correctly hides ineligible
    // candidates entirely). listByRun's default excludes them, which
    // silently zeroed this stat out for any run where every candidate
    // happened to be ineligible — confirmed live during a comprehensive
    // test with real data.
    const results = await deps.matchResults.listByRun(job.publishedMatchRunId as string, { includeIneligible: true });
    for (const result of results) {
      aggregateOutcomes[result.bucket] += 1;
    }
  }

  return { needsAttention, pipeline, candidatePoolHealth, aggregateOutcomes, recentActivity };
}
