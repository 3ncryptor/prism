"use client";

import { useState } from "react";
import Link from "next/link";
import type { Job } from "@/lib/schemas/job";
import { JobUploadForm } from "@/app/admin/JobUploadForm";
import { jobStatusColor, jobStatusLabel } from "@/app/admin/jobStatusDisplay";
import { MUTED_TEXT_COLOR, BRAND_COLOR } from "@/lib/designTokens";
import { PageHeader } from "@/lib/layout/PageHeader";
import { EmptyState } from "@/lib/layout/EmptyState";
import { Typography } from "@/lib/ui/Typography";
import { Badge } from "@/lib/ui/Badge";
import { useStagger } from "@/lib/motion/useStagger";

interface JobsListDashboardProps {
  initialJobs: Job[];
}

/**
 * docs/screens.md §8.8 (feature 27o): visual pass — migrated off Grauity
 * onto lib/ui, list rows get useStagger on first render. Behavior
 * unchanged from feature 27n's move.
 */
export function JobsListDashboard({ initialJobs }: JobsListDashboardProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const listRef = useStagger<HTMLDivElement>([jobs.length]);

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
        <Typography variant="h3">Upload a job description</Typography>
        <JobUploadForm onUploaded={refreshJobs} />
      </div>

      <div className="flex flex-col gap-3">
        {jobs.length === 0 ? (
          <EmptyState message="No job descriptions uploaded yet." />
        ) : (
          <div ref={listRef} className="flex flex-col gap-2">
            {jobs.map((job) => (
              <Link
                key={job._id}
                href={`/admin/jobs/${job._id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors duration-150 ease-out hover:bg-gray-100"
              >
                <div>
                  <Typography variant="body" as="span" className="font-semibold">
                    {job.title}
                  </Typography>
                  {job.company && <Typography variant="caption">{job.company}</Typography>}
                </div>
                <div className="flex items-center gap-2">
                  <Typography
                    variant="body"
                    as="span"
                    className="font-semibold"
                    style={{ color: job.listingStatus === "LIVE" ? BRAND_COLOR : MUTED_TEXT_COLOR }}
                  >
                    {job.listingStatus === "LIVE" ? "Live" : "Draft"}
                  </Typography>
                  <Badge tone={jobStatusColor(job.status)}>{jobStatusLabel(job.status)}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
