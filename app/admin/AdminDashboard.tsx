"use client";

import { useState } from "react";
import Link from "next/link";
import { NSPill, NSTypography } from "@newtonschool/grauity";
import type { Job } from "@/lib/schemas/job";
import { JobUploadForm } from "@/app/admin/JobUploadForm";
import { jobStatusColor, jobStatusLabel } from "@/app/admin/jobStatusDisplay";
import { MUTED_TEXT_COLOR, BRAND_COLOR } from "@/lib/grauityTheme";
import { PageHeader } from "@/lib/layout/PageHeader";
import { EmptyState } from "@/lib/layout/EmptyState";

interface AdminDashboardProps {
  initialJobs: Job[];
}

export function AdminDashboard({ initialJobs }: AdminDashboardProps) {
  const [jobs, setJobs] = useState(initialJobs);

  async function refreshJobs() {
    const response = await fetch("/api/admin/jobs");
    if (!response.ok) return;
    const data: { jobs: Job[] } = await response.json();
    setJobs(data.jobs);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Jobs" />

      <div className="flex flex-col gap-3">
        <NSTypography variant="heading-sb-h4" as="h2">
          Upload a job description
        </NSTypography>
        <JobUploadForm onUploaded={refreshJobs} />
      </div>

      <div className="flex flex-col gap-3">
        {jobs.length === 0 ? (
          <EmptyState message="No job descriptions uploaded yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {jobs.map((job) => (
              <Link
                key={job._id}
                href={`/admin/jobs/${job._id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors duration-150 ease-out hover:bg-gray-100"
              >
                <div>
                  <NSTypography variant="paragraph-sb-p2" as="span">
                    {job.title}
                  </NSTypography>
                  {job.company && (
                    <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                      {job.company}
                    </NSTypography>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <NSTypography variant="paragraph-sb-p3" color={job.listingStatus === "LIVE" ? BRAND_COLOR : MUTED_TEXT_COLOR}>
                    {job.listingStatus === "LIVE" ? "Live" : "Draft"}
                  </NSTypography>
                  <NSPill color={jobStatusColor(job.status)} isActive>
                    {jobStatusLabel(job.status)}
                  </NSPill>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
