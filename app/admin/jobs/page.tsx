import { requireRole } from "@/lib/auth/guard";
import { jobRepository } from "@/lib/db/repositories/jobRepository";
import { ClientOnlyJobsList } from "@/app/admin/jobs/ClientOnlyJobsList";

/** buildPlan.md §84, §106 — feature #22. Moved here from /admin in feature 27n (docs/screens.md §8.7). */
export default async function JobsListPage() {
  await requireRole("ADMIN");
  const jobs = await jobRepository.list();

  return <ClientOnlyJobsList initialJobs={jobs} />;
}
