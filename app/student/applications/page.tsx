import { requireRole } from "@/lib/auth/guard";
import { ApplicationsPageContent } from "@/app/student/applications/ApplicationsPageContent";

/**
 * docs/screens.md §4.7 — feature 27a. Renders directly (no ssr:false
 * wrapper) since feature 27m migrated this whole tree off Grauity.
 */
export default async function ApplicationsPage() {
  await requireRole("STUDENT");
  return <ApplicationsPageContent />;
}
