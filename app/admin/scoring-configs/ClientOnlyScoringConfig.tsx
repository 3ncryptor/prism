"use client";

import { withClientOnlyGrauity } from "@/lib/withClientOnlyGrauity";
import type { ScoringConfigDashboard } from "@/app/admin/scoring-configs/ScoringConfigDashboard";

export const ClientOnlyScoringConfig = withClientOnlyGrauity<React.ComponentProps<typeof ScoringConfigDashboard>>(() =>
  import("@/app/admin/scoring-configs/ScoringConfigDashboard").then((mod) => mod.ScoringConfigDashboard),
);
