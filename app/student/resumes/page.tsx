import { requireRole } from "@/lib/auth/guard";
import { ClientOnlyResumes } from "@/app/student/resumes/ClientOnlyResumes";

/** docs/screens.md §4.6 — feature 27d. */
export default async function ResumesPage() {
  await requireRole("STUDENT");
  return <ClientOnlyResumes />;
}
