import { requireRole } from "@/lib/auth/guard";
import { ClientOnlyProfile } from "@/app/student/profile/ClientOnlyProfile";

/** docs/screens.md §4.8 — feature 27f. */
export default async function ProfilePage() {
  await requireRole("STUDENT");
  return <ClientOnlyProfile />;
}
