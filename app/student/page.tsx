import { requireRole } from "@/lib/auth/guard";
import { studentProfileRepository } from "@/lib/db/repositories/studentProfileRepository";
import { getActiveResume } from "@/lib/services/resumeService";
import { ClientOnlyStudentDashboard } from "@/app/student/ClientOnlyDashboard";

/** buildPlan.md §106, §97 — feature #10. Shell (identity/sign-out) lives in app/student/layout.tsx (feature 27a). */
export default async function StudentHome() {
  const session = await requireRole("STUDENT");

  const [profile, resume] = await Promise.all([
    studentProfileRepository.getActiveByStudent(session.user.id),
    getActiveResume(session.user.id),
  ]);

  return <ClientOnlyStudentDashboard initialProfile={profile} initialResume={resume} />;
}
