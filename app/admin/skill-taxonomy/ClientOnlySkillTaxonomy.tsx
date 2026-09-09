"use client";

import { withClientOnlyGrauity } from "@/lib/withClientOnlyGrauity";
import type { SkillTaxonomyDashboard } from "@/app/admin/skill-taxonomy/SkillTaxonomyDashboard";

export const ClientOnlySkillTaxonomy = withClientOnlyGrauity<React.ComponentProps<typeof SkillTaxonomyDashboard>>(() =>
  import("@/app/admin/skill-taxonomy/SkillTaxonomyDashboard").then((mod) => mod.SkillTaxonomyDashboard),
);
