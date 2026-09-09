import { requireRole } from "@/lib/auth/guard";
import { signOut } from "@/lib/auth/config";
import { studentProfileRepository } from "@/lib/db/repositories/studentProfileRepository";
import { getActiveResume } from "@/lib/services/resumeService";
import { ClientOnlyStudentDashboard } from "@/app/student/ClientOnlyDashboard";

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

/** buildPlan.md §106, §97 — feature #10. */
export default async function StudentHome() {
  const session = await requireRole("STUDENT");

  const [profile, resume] = await Promise.all([
    studentProfileRepository.getActiveByStudent(session.user.id),
    getActiveResume(session.user.id),
  ]);

  return (
    <ClientOnlyStudentDashboard
      studentName={session.user.name ?? ""}
      studentEmail={session.user.email ?? ""}
      initialProfile={profile}
      initialResume={resume}
      onSignOut={handleSignOut}
    />
  );
}
