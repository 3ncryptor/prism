import { requireRole } from "@/lib/auth/guard";
import { signOut } from "@/lib/auth/config";
import { listSkillsWithUsage } from "@/lib/services/skillTaxonomyService";
import { ClientOnlySkillTaxonomy } from "@/app/admin/skill-taxonomy/ClientOnlySkillTaxonomy";

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

/** buildPlan.md §116 — feature #22b. */
export default async function SkillTaxonomyPage() {
  const session = await requireRole("ADMIN");
  const skills = await listSkillsWithUsage();

  return (
    <ClientOnlySkillTaxonomy
      adminName={session.user.name ?? ""}
      adminEmail={session.user.email ?? ""}
      initialSkills={skills}
      onSignOut={handleSignOut}
    />
  );
}
