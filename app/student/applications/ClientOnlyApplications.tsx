"use client";

import { withClientOnlyGrauity } from "@/lib/withClientOnlyGrauity";

export const ClientOnlyApplications = withClientOnlyGrauity<Record<string, never>>(() =>
  import("@/app/student/applications/ApplicationsPageContent").then((mod) => mod.ApplicationsPageContent),
);
