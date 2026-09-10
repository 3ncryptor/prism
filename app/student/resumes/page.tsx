import { requireRole } from "@/lib/auth/guard";
import { ResumesPageContent } from "@/app/student/resumes/ResumesPageContent";

/**
 * docs/screens.md §4.6 — feature 27d. Renders directly (no ssr:false
 * wrapper) since feature 27m migrated this whole tree off Grauity.
 */
export default async function ResumesPage() {
  await requireRole("STUDENT");
  return <ResumesPageContent />;
}
