"use client";

import { withClientOnlyGrauity } from "@/lib/withClientOnlyGrauity";

export const ClientOnlyResumes = withClientOnlyGrauity<Record<string, never>>(() =>
  import("@/app/student/resumes/ResumesPageContent").then((mod) => mod.ResumesPageContent),
);
