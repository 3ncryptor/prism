import { requireRole } from "@/lib/auth/guard";
import { listScoringConfigVersions } from "@/lib/services/scoringConfigService";
import { ScoringConfigDashboard } from "@/app/admin/scoring-configs/ScoringConfigDashboard";

/**
 * buildPlan.md §113.3 — feature #22c. Shell (identity/sign-out) lives in
 * app/admin/layout.tsx (feature 27a). Renders directly (no ssr:false
 * wrapper) since feature 27o migrated this page off Grauity.
 */
export default async function ScoringConfigPage() {
  await requireRole("ADMIN");
  const versions = await listScoringConfigVersions();

  return <ScoringConfigDashboard initialVersions={versions} />;
}
