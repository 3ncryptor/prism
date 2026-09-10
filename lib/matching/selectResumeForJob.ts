export interface RoutableCandidate {
  jobRole: string | null;
}

/**
 * docs/screens.md §3 decision #2 (feature 27e): pure, deterministic
 * candidate-selection rule for one student's set of currently-published
 * resumes/profiles against one job. Prefer the resume tagged with the
 * job's exact role; fall back to the global (untagged) resume; otherwise
 * the student is skipped for this job entirely. Combined with the
 * "at most one published resume per role" invariant enforced at publish
 * time (resumeService.setResumePublishStatus), a student never appears
 * more than once on a job's leaderboard.
 *
 * A job with no role assigned (jobRole === null — only possible for a JD
 * that existed before this feature shipped) matches only students'
 * global resumes, since there is no specific role to match against.
 */
export function selectResumeForJob<T extends RoutableCandidate>(
  jobRole: string | null,
  candidates: T[],
): T | null {
  if (jobRole !== null) {
    const roleMatch = candidates.find((candidate) => candidate.jobRole === jobRole);
    if (roleMatch) return roleMatch;
  }
  return candidates.find((candidate) => candidate.jobRole === null) ?? null;
}
