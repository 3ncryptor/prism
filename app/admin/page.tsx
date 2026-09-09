import { requireRole } from "@/lib/auth/guard";
import { jobRepository } from "@/lib/db/repositories/jobRepository";
import { ClientOnlyAdminDashboard } from "@/app/admin/ClientOnlyAdminDashboard";

/** buildPlan.md §84, §106 — feature #22. Shell (identity/sign-out) lives in app/admin/layout.tsx (feature 27a). */
export default async function AdminHome() {
  await requireRole("ADMIN");
  const jobs = await jobRepository.list();

  return <ClientOnlyAdminDashboard initialJobs={jobs} />;
}
