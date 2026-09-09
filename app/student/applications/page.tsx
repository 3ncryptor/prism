import { requireRole } from "@/lib/auth/guard";
import { ClientOnlyApplications } from "@/app/student/applications/ClientOnlyApplications";

/** docs/screens.md §4.7 — feature 27a. */
export default async function ApplicationsPage() {
  await requireRole("STUDENT");
  return <ClientOnlyApplications />;
}
