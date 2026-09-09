"use client";

import { PageHeader } from "@/lib/layout/PageHeader";
import { ApplicationsSection } from "@/app/student/ApplicationsSection";

/** docs/screens.md §4.7 — feature 27a: promotes the dashboard-embedded ApplicationsSection to its own nav-linked page. */
export function ApplicationsPageContent() {
  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Applications" />
      <ApplicationsSection />
    </div>
  );
}
