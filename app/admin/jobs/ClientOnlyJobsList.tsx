"use client";

import { withClientOnlyGrauity } from "@/lib/withClientOnlyGrauity";
import type { JobsListDashboard } from "@/app/admin/jobs/JobsListDashboard";

export const ClientOnlyJobsList = withClientOnlyGrauity<React.ComponentProps<typeof JobsListDashboard>>(() =>
  import("@/app/admin/jobs/JobsListDashboard").then((mod) => mod.JobsListDashboard),
);
