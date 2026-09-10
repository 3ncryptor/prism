import { requireRole } from "@/lib/auth/guard";
import { ProfilePageContent } from "@/app/student/profile/ProfilePageContent";

/**
 * docs/screens.md §4.8 — feature 27f. Renders directly (no ssr:false
 * wrapper) since feature 27m migrated this whole tree off Grauity.
 */
export default async function ProfilePage() {
  await requireRole("STUDENT");
  return <ProfilePageContent />;
}
