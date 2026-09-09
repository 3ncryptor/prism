"use client";

import { useState } from "react";
import Link from "next/link";
import { NSButton, NSPill, NSTypography } from "@newtonschool/grauity";
import type { Job } from "@/lib/schemas/job";
import { JobUploadForm } from "@/app/admin/JobUploadForm";
import { jobStatusColor, jobStatusLabel } from "@/app/admin/jobStatusDisplay";
import { MUTED_TEXT_COLOR } from "@/lib/grauityTheme";

interface AdminDashboardProps {
  adminName: string;
  adminEmail: string;
  initialJobs: Job[];
  onSignOut: () => void;
}

export function AdminDashboard({ adminName, adminEmail, initialJobs, onSignOut }: AdminDashboardProps) {
  const [jobs, setJobs] = useState(initialJobs);

  async function refreshJobs() {
    const response = await fetch("/api/admin/jobs");
    if (!response.ok) return;
    const data: { jobs: Job[] } = await response.json();
    setJobs(data.jobs);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <header className="flex items-center justify-between gap-4">
          <div>
            <NSTypography variant="heading-sb-h2" as="h1">
              {adminName}
            </NSTypography>
            <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
              {adminEmail}
            </NSTypography>
          </div>
          <form action={onSignOut}>
            <NSButton variant="tertiary" type="submit">
              Sign out
            </NSButton>
          </form>
        </header>

        <section className="flex flex-col gap-3">
          <NSTypography variant="heading-sb-h4" as="h2">
            Upload a job description
          </NSTypography>
          <JobUploadForm onUploaded={refreshJobs} />
        </section>

        <section className="flex flex-col gap-3">
          <NSTypography variant="heading-sb-h4" as="h2">
            Jobs
          </NSTypography>
          {jobs.length === 0 ? (
            <NSTypography variant="paragraph-md-p2" color={MUTED_TEXT_COLOR}>
              No job descriptions uploaded yet.
            </NSTypography>
          ) : (
            <div className="flex flex-col gap-2">
              {jobs.map((job) => (
                <Link
                  key={job._id}
                  href={`/admin/jobs/${job._id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100"
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
                  <NSPill color={jobStatusColor(job.status)} isActive>
                    {jobStatusLabel(job.status)}
                  </NSPill>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
