"use client";

import { withClientOnlyGrauity } from "@/lib/withClientOnlyGrauity";
import type { JobRoleTaxonomyDashboard } from "@/app/admin/job-roles/JobRoleTaxonomyDashboard";

export const ClientOnlyJobRoleTaxonomy = withClientOnlyGrauity<React.ComponentProps<typeof JobRoleTaxonomyDashboard>>(() =>
  import("@/app/admin/job-roles/JobRoleTaxonomyDashboard").then((mod) => mod.JobRoleTaxonomyDashboard),
);
