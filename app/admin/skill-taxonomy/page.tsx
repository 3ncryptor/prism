import { requireRole } from "@/lib/auth/guard";
import { listSkillsWithUsage } from "@/lib/services/skillTaxonomyService";
import { ClientOnlySkillTaxonomy } from "@/app/admin/skill-taxonomy/ClientOnlySkillTaxonomy";

/** buildPlan.md §116 — feature #22b. Shell (identity/sign-out) lives in app/admin/layout.tsx (feature 27a). */
export default async function SkillTaxonomyPage() {
  await requireRole("ADMIN");
  const skills = await listSkillsWithUsage();

  return <ClientOnlySkillTaxonomy initialSkills={skills} />;
}
