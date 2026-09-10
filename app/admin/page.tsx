import { requireRole } from "@/lib/auth/guard";
import { getAdminDashboardData } from "@/lib/services/adminDashboardService";
import { AdminDashboardOverview } from "@/app/admin/AdminDashboardOverview";

/**
 * buildPlan.md §84, §106 — feature #22, rebuilt as a real dashboard in
 * feature 27n (docs/screens.md §8.7). The Jobs list that used to live
 * here moved to /admin/jobs.
 */
export default async function AdminHome() {
  await requireRole("ADMIN");
  const data = await getAdminDashboardData();

  return <AdminDashboardOverview data={data} />;
}
