import { requireRole } from "@/lib/auth/guard";
import { signOut } from "@/lib/auth/config";
import { listScoringConfigVersions } from "@/lib/services/scoringConfigService";
import { ClientOnlyScoringConfig } from "@/app/admin/scoring-configs/ClientOnlyScoringConfig";

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

/** buildPlan.md §113.3 — feature #22c. */
export default async function ScoringConfigPage() {
  const session = await requireRole("ADMIN");
  const versions = await listScoringConfigVersions();

  return (
    <ClientOnlyScoringConfig
      adminName={session.user.name ?? ""}
      adminEmail={session.user.email ?? ""}
      initialVersions={versions}
      onSignOut={handleSignOut}
    />
  );
}
