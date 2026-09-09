"use client";

import { useEffect, useState } from "react";
import { NSButton, NSPill, NSTypography } from "@newtonschool/grauity";
import { MUTED_TEXT_COLOR } from "@/lib/grauityTheme";
import { EvidenceList } from "@/app/shared/EvidenceList";
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

const BUCKET_COLOR = {
  BEST_FIT: "success",
  MODERATE_FIT: "warning",
  LOW_FIT: "error",
} as const;

const BUCKET_LABEL = {
  BEST_FIT: "Best Fit",
  MODERATE_FIT: "Moderate",
  LOW_FIT: "Low Fit",
} as const;

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
  if (applications.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-6">
      <NSTypography variant="heading-sb-h4" as="h2">
        Applications
      </NSTypography>
      <div className="flex flex-col gap-3">
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
                    <NSPill color={BUCKET_COLOR[application.bucket]} isActive>
                      {BUCKET_LABEL[application.bucket]}
                    </NSPill>
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
    </section>
  );
}
