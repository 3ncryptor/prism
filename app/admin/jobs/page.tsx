import { requireRole } from "@/lib/auth/guard";
import { jobRepository } from "@/lib/db/repositories/jobRepository";
import { JobsListDashboard } from "@/app/admin/jobs/JobsListDashboard";

/**
 * buildPlan.md §84, §106 — feature #22. Moved here from /admin in feature
 * 27n (docs/screens.md §8.7); renders directly (no ssr:false wrapper)
 * since feature 27o migrated this page off Grauity.
 */
export default async function JobsListPage() {
  await requireRole("ADMIN");
  const jobs = await jobRepository.list();

  return <JobsListDashboard initialJobs={jobs} />;
}
