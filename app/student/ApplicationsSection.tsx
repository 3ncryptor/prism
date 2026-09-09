"use client";

import { useEffect, useState } from "react";
import { NSButton, NSPill, NSTypography } from "@newtonschool/grauity";
import { MUTED_TEXT_COLOR } from "@/lib/grauityTheme";
import { EvidenceList } from "@/app/shared/EvidenceList";
import { BucketPill } from "@/lib/layout/BucketPill";
import { EmptyState } from "@/lib/layout/EmptyState";
import type { MatchEvidenceDoc } from "@/lib/schemas/matchResult";

interface PublishedApplication {
  jobId: string;
  title: string;
  company?: string;
  status: "published";
  score: number;
  confidence: number;
  bucket: "BEST_FIT" | "MODERATE_FIT" | "LOW_FIT";
  missingRequirements: string[];
  evidence: MatchEvidenceDoc[];
}

interface UnderReviewApplication {
  jobId: string;
  title: string;
  company?: string;
  status: "under_review";
}

type Application = PublishedApplication | UnderReviewApplication;

/**
 * buildPlan.md §86: shows every job the student has been evaluated for.
 * A job with no published match run for this student's result shows
 * "Under review" only — no score/bucket/evidence (§113.2/§0.6).
 */
export function ApplicationsSection() {
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/matches")
      .then((res) => (res.ok ? res.json() : { applications: [] }))
      .then((data: { applications: Application[] }) => {
        if (!cancelled) setApplications(data.applications);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (applications === null) return null;
  if (applications.length === 0) {
    return <EmptyState message="No applications yet. Once an admin evaluates a job you're a candidate for, it will show up here." />;
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-6">
      {applications.map((application) => {
        const isExpanded = expandedJobId === application.jobId;
        return (
          <div key={application.jobId} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <div>
                <NSTypography variant="paragraph-sb-p2" as="h3">
                  {application.title}
                </NSTypography>
                {application.company && (
                  <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                    {application.company}
                  </NSTypography>
                )}
              </div>
              {application.status === "published" ? (
                <div className="flex items-center gap-3">
                  <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                    Score: {application.score.toFixed(1)}
                  </NSTypography>
                  <BucketPill bucket={application.bucket} />
                  <NSButton
                    variant="tertiary"
                    size="small"
                    onClick={() => setExpandedJobId(isExpanded ? null : application.jobId)}
                  >
                    {isExpanded ? "Hide evidence" : "View evidence"}
                  </NSButton>
                </div>
              ) : (
                <NSPill color="brand" isActive>
                  Under review
                </NSPill>
              )}
            </div>
            {application.status === "published" && isExpanded && (
              <div className="mt-3">
                <EvidenceList evidence={application.evidence} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
