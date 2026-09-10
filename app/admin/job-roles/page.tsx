import { requireRole } from "@/lib/auth/guard";
import { listRolesWithUsage } from "@/lib/services/jobRoleTaxonomyService";
import { JobRoleTaxonomyDashboard } from "@/app/admin/job-roles/JobRoleTaxonomyDashboard";

/**
 * docs/screens.md §4.11 — feature 27e. Shell (identity/sign-out) lives in
 * app/admin/layout.tsx (feature 27a). Renders directly (no ssr:false
 * wrapper) since feature 27o migrated this page off Grauity.
 */
export default async function JobRolesPage() {
  await requireRole("ADMIN");
  const roles = await listRolesWithUsage();

  return <JobRoleTaxonomyDashboard initialRoles={roles} />;
}
