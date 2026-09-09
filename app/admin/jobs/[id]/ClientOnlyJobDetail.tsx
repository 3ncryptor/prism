"use client";

import { withClientOnlyGrauity } from "@/lib/withClientOnlyGrauity";
import type { JobDetailDashboard } from "@/app/admin/jobs/[id]/JobDetailDashboard";

export const ClientOnlyJobDetail = withClientOnlyGrauity<React.ComponentProps<typeof JobDetailDashboard>>(() =>
  import("@/app/admin/jobs/[id]/JobDetailDashboard").then((mod) => mod.JobDetailDashboard),
);
