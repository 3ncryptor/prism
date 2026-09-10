import { requireRole } from "@/lib/auth/guard";
import { getStudentDashboardData } from "@/lib/services/studentDashboardService";
import { StudentDashboard } from "@/app/student/StudentDashboard";

/**
 * buildPlan.md §106, §97 — feature #10, rebuilt with real aggregations in
 * feature 27l (docs/screens.md §8.5). Shell (identity/sign-out) lives in
 * app/student/layout.tsx (feature 27a). No Grauity anywhere in this
 * component tree anymore, so this renders directly — the client-only
 * ssr:false wrapper (app/student/ClientOnlyDashboard.tsx) was only ever a
 * workaround for Grauity's non-deterministic SSR class names, which no
 * longer applies once StudentDashboard stops importing it.
 */
export default async function StudentHome() {
  const session = await requireRole("STUDENT");
  const data = await getStudentDashboardData(session.user.id);

  return <StudentDashboard data={data} />;
}
