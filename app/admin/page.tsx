import { requireRole } from "@/lib/auth/guard";
import { signOut } from "@/lib/auth/config";
import { jobRepository } from "@/lib/db/repositories/jobRepository";
import { ClientOnlyAdminDashboard } from "@/app/admin/ClientOnlyAdminDashboard";

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

/** buildPlan.md §84, §106 — feature #22. */
export default async function AdminHome() {
  const session = await requireRole("ADMIN");
  const jobs = await jobRepository.list();

  return (
    <ClientOnlyAdminDashboard
      adminName={session.user.name ?? ""}
      adminEmail={session.user.email ?? ""}
      initialJobs={jobs}
      onSignOut={handleSignOut}
    />
  );
}
