"use client";

import { withClientOnlyGrauity } from "@/lib/withClientOnlyGrauity";

export const ClientOnlyProfile = withClientOnlyGrauity<Record<string, never>>(() =>
  import("@/app/student/profile/ProfilePageContent").then((mod) => mod.ProfilePageContent),
);
