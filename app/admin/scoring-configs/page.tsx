import { requireRole } from "@/lib/auth/guard";
import { listScoringConfigVersions } from "@/lib/services/scoringConfigService";
import { ClientOnlyScoringConfig } from "@/app/admin/scoring-configs/ClientOnlyScoringConfig";

/** buildPlan.md §113.3 — feature #22c. Shell (identity/sign-out) lives in app/admin/layout.tsx (feature 27a). */
export default async function ScoringConfigPage() {
  await requireRole("ADMIN");
  const versions = await listScoringConfigVersions();

  return <ClientOnlyScoringConfig initialVersions={versions} />;
}
