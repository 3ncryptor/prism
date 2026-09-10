"use client";

import { useEffect, useState } from "react";
import { Typography } from "@/lib/ui/Typography";
import { Button } from "@/lib/ui/Button";
import { Badge } from "@/lib/ui/Badge";
import { MUTED_TEXT_COLOR } from "@/lib/designTokens";
import { EvidenceList } from "@/app/shared/EvidenceList";
import { BucketPill } from "@/lib/layout/BucketPill";
import { EmptyState } from "@/lib/layout/EmptyState";
import { useStagger } from "@/lib/motion/useStagger";
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
 * "Under review" only — no score/bucket/evidence (§113.2/§0.6). Migrated
 * off Grauity in feature 27m (docs/screens.md §8.6).
 */
export function ApplicationsSection() {
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const listRef = useStagger<HTMLDivElement>([applications?.length ?? 0]);

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
    <div ref={listRef} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-6">
      {applications.map((application) => {
        const isExpanded = expandedJobId === application.jobId;
        return (
          <div key={application.jobId} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="body" as="h3" className="font-semibold">
                  {application.title}
                </Typography>
                {application.company && <Typography variant="caption">{application.company}</Typography>}
              </div>
              {application.status === "published" ? (
                <div className="flex items-center gap-3">
                  <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>
                    Score: {application.score.toFixed(1)}
                  </Typography>
                  <BucketPill bucket={application.bucket} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedJobId(isExpanded ? null : application.jobId)}
                  >
                    {isExpanded ? "Hide evidence" : "View evidence"}
                  </Button>
                </div>
              ) : (
                <Badge tone="brand">Under review</Badge>
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
