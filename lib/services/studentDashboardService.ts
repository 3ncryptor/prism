import { resumeRepository, type ResumeRepository } from "@/lib/db/repositories/resumeRepository";
import {
  jobRoleTaxonomyRepository,
  type JobRoleTaxonomyRepository,
} from "@/lib/db/repositories/jobRoleTaxonomyRepository";
import { matchResultRepository, type MatchResultRepository } from "@/lib/db/repositories/matchResultRepository";
import { jobRepository, type JobRepository } from "@/lib/db/repositories/jobRepository";
import { userRepository, type UserRepository } from "@/lib/db/repositories/userRepository";
import {
  studentProfileRepository,
  type StudentProfileRepository,
} from "@/lib/db/repositories/studentProfileRepository";
import type { User } from "@/lib/schemas/user";
import type { Skill } from "@/lib/schemas/studentProfile";
import type { FitBucket } from "@/lib/matching/types";

export interface RoleCoverage {
  canonicalName: string;
  displayName: string;
  isPublished: boolean;
}

export interface RecentResult {
  jobId: string;
  title: string;
  company?: string;
  bucket: FitBucket;
  score: number;
}

export interface StudentDashboardData {
  roleCoverage: RoleCoverage[];
  publishedRoleCount: number;
  totalRoleCount: number;
  bucketCounts: Record<FitBucket, number>;
  recentResults: RecentResult[];
  profileCompletionPercent: number;
  /** Union of skills across all of the student's *active* (published) resumes, deduplicated by canonicalName. */
  skills: Skill[];
}

type Deps = {
  resumes: Pick<ResumeRepository, "listByStudent">;
  jobRoles: Pick<JobRoleTaxonomyRepository, "listActive">;
  matchResults: Pick<MatchResultRepository, "listByStudent">;
  jobs: Pick<JobRepository, "get">;
  users: Pick<UserRepository, "findById">;
  studentProfiles: Pick<StudentProfileRepository, "getByResumeId">;
};

const defaultDeps: Deps = {
  resumes: resumeRepository,
  jobRoles: jobRoleTaxonomyRepository,
  matchResults: matchResultRepository,
  jobs: jobRepository,
  users: userRepository,
  studentProfiles: studentProfileRepository,
};

const PROFILE_FIELDS = [
  "phone",
  "linkedinUrl",
  "githubUrl",
  "portfolioUrl",
  "rollNumber",
  "branch",
  "batchYear",
] as const satisfies readonly (keyof User)[];

const RECENT_RESULTS_LIMIT = 3;

/**
 * docs/screens.md §8.5 (feature 27l). Replaces the old single-resume
 * dashboard (which called resumeRepository.getActiveByStudent() — a
 * `findOne` with no sort, so under the multi-resume-per-role model it
 * returned one arbitrary published resume, not "the" resume) with real
 * aggregations across all of a student's data. Reuses the same
 * published-vs-under_review gating already implemented in
 * app/api/matches/route.ts rather than reimplementing it.
 */
export async function getStudentDashboardData(
  studentId: string,
  deps: Deps = defaultDeps,
): Promise<StudentDashboardData> {
  const [resumes, activeRoles, matchResults, user] = await Promise.all([
    deps.resumes.listByStudent(studentId),
    deps.jobRoles.listActive(),
    deps.matchResults.listByStudent(studentId),
    deps.users.findById(studentId),
  ]);

  const publishedRoles = new Set(
    resumes.filter((resume) => resume.isActive && resume.jobRole).map((resume) => resume.jobRole),
  );
  const roleCoverage: RoleCoverage[] = activeRoles.map((role) => ({
    canonicalName: role.canonicalName,
    displayName: role.displayName,
    isPublished: publishedRoles.has(role.canonicalName),
  }));

  const bucketCounts: Record<FitBucket, number> = { BEST_FIT: 0, MODERATE_FIT: 0, LOW_FIT: 0 };

  const resultsByJob = new Map<string, typeof matchResults>();
  for (const result of matchResults) {
    const list = resultsByJob.get(result.jobId) ?? [];
    list.push(result);
    resultsByJob.set(result.jobId, list);
  }

  const publishedEntries: RecentResult[] = [];
  const publishedTimestamps: number[] = [];
  for (const [jobId, results] of resultsByJob) {
    const job = await deps.jobs.get(jobId);
    if (!job || !job.publishedMatchRunId) continue;
    const published = results.find((result) => result.matchRunId === job.publishedMatchRunId);
    if (!published) continue;

    bucketCounts[published.bucket] += 1;
    publishedEntries.push({ jobId, title: job.title, company: job.company, bucket: published.bucket, score: published.score });
    publishedTimestamps.push(published.createdAt.getTime());
  }

  const recentResults = publishedEntries
    .map((entry, index) => ({ entry, timestamp: publishedTimestamps[index] }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, RECENT_RESULTS_LIMIT)
    .map(({ entry }) => entry);

  const filledFieldCount = user ? PROFILE_FIELDS.filter((field) => Boolean(user[field])).length : 0;
  const profileCompletionPercent = Math.round((filledFieldCount / PROFILE_FIELDS.length) * 100);

  const activeResumes = resumes.filter((resume) => resume.isActive);
  const profiles = await Promise.all(activeResumes.map((resume) => deps.studentProfiles.getByResumeId(resume._id)));
  const skillsByCanonicalName = new Map<string, Skill>();
  for (const profile of profiles) {
    if (!profile) continue;
    for (const skill of profile.skills) {
      if (!skillsByCanonicalName.has(skill.canonicalName)) {
        skillsByCanonicalName.set(skill.canonicalName, skill);
      }
    }
  }

  return {
    roleCoverage,
    publishedRoleCount: roleCoverage.filter((role) => role.isPublished).length,
    totalRoleCount: roleCoverage.length,
    bucketCounts,
    recentResults,
    profileCompletionPercent,
    skills: Array.from(skillsByCanonicalName.values()),
  };
}
