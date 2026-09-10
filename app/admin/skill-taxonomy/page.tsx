import { requireRole } from "@/lib/auth/guard";
import { listSkillsWithUsage } from "@/lib/services/skillTaxonomyService";
import { SkillTaxonomyDashboard } from "@/app/admin/skill-taxonomy/SkillTaxonomyDashboard";

/**
 * buildPlan.md §116 — feature #22b. Shell (identity/sign-out) lives in
 * app/admin/layout.tsx (feature 27a). Renders directly (no ssr:false
 * wrapper) since feature 27o migrated this page off Grauity.
 */
export default async function SkillTaxonomyPage() {
  await requireRole("ADMIN");
  const skills = await listSkillsWithUsage();

  return <SkillTaxonomyDashboard initialSkills={skills} />;
}
