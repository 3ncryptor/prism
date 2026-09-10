import { requireRole } from "@/lib/auth/guard";
import { listRolesWithUsage } from "@/lib/services/jobRoleTaxonomyService";
import { ClientOnlyJobRoleTaxonomy } from "@/app/admin/job-roles/ClientOnlyJobRoleTaxonomy";

/** docs/screens.md §4.11 — feature 27e. Shell (identity/sign-out) lives in app/admin/layout.tsx (feature 27a). */
export default async function JobRolesPage() {
  await requireRole("ADMIN");
  const roles = await listRolesWithUsage();

  return <ClientOnlyJobRoleTaxonomy initialRoles={roles} />;
}
