"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";
import { StatCard } from "@/lib/layout/StatCard";
import { Button } from "@/lib/ui/Button";
import { Badge } from "@/lib/ui/Badge";
import { Typography } from "@/lib/ui/Typography";
import { EmptyState } from "@/lib/layout/EmptyState";
import { MUTED_TEXT_COLOR } from "@/lib/designTokens";
import type { AdminDashboardData, NeedsAttentionJob } from "@/lib/services/adminDashboardService";

const BUCKET_LABELS = { BEST_FIT: "Best Fit", MODERATE_FIT: "Moderate Fit", LOW_FIT: "Low Fit" } as const;
const BUCKET_COLORS = { BEST_FIT: "#16a34a", MODERATE_FIT: "#d97706", LOW_FIT: "#dc2626" } as const;
const NEEDS_ATTENTION_REASON_LABEL: Record<NeedsAttentionJob["reason"], string> = {
  no_run: "No matching run yet",
  stale_run: "Latest run is over a week old",
};

interface AdminDashboardOverviewProps {
  data: AdminDashboardData;
}

/**
 * docs/screens.md §8.7 (feature 27n). The admin's new landing page — the
 * Jobs list (with the upload form) moved to /admin/jobs. Built directly
 * on lib/ui/lib/layout, no Grauity, no ssr:false wrapper needed.
 */
export function AdminDashboardOverview({ data }: AdminDashboardOverviewProps) {
  const [needsAttention, setNeedsAttention] = useState(data.needsAttention);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  async function handleRunMatching(jobId: string) {
    setRunError(null);
    setRunningJobId(jobId);
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/match`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Failed to start matching.");
      setNeedsAttention((prev) => prev.filter((job) => job.jobId !== jobId));
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Failed to start matching.");
    } finally {
      setRunningJobId(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Dashboard" />

      <Card className="flex flex-col gap-3">
        <Typography variant="h2">Needs attention</Typography>
        {runError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {runError}
          </p>
        )}
        {needsAttention.length === 0 ? (
          <EmptyState message="Nothing needs attention right now — every live job has a recent matching run." />
        ) : (
          <div className="flex flex-col gap-2">
            {needsAttention.map((job) => (
              <div
                key={job.jobId}
                className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="flex flex-col">
                  <Link href={`/admin/jobs/${job.jobId}`} className="font-semibold text-gray-900 hover:underline">
                    {job.title}
                  </Link>
                  {job.company && <Typography variant="caption">{job.company}</Typography>}
                  <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>
                    {NEEDS_ATTENTION_REASON_LABEL[job.reason]}
                  </Typography>
                </div>
                <Button size="sm" disabled={runningJobId === job.jobId} onClick={() => handleRunMatching(job.jobId)}>
                  {runningJobId === job.jobId ? "Starting…" : "Run Matching"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Live" value={data.pipeline.live} />
        <StatCard label="Draft" value={data.pipeline.draft} />
        <StatCard label="Ready" value={data.pipeline.ready} />
        <StatCard label="Still processing" value={data.pipeline.processing} />
      </div>

      <Card className="flex flex-col gap-3">
        <Typography variant="h2">Candidate pool health</Typography>
        {data.candidatePoolHealth.length === 0 ? (
          <Typography variant="body" style={{ color: MUTED_TEXT_COLOR }}>
            No job roles have been set up yet.
          </Typography>
        ) : (
          <div className="flex flex-col gap-2">
            {data.candidatePoolHealth.map((role) => (
              <div key={role.canonicalName} className="flex items-center justify-between gap-4">
                <Typography variant="body">{role.displayName}</Typography>
                <Badge tone={role.activeResumeCount === 0 ? "warning" : "neutral"}>
                  {role.activeResumeCount} {role.activeResumeCount === 1 ? "student" : "students"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(Object.keys(BUCKET_LABELS) as Array<keyof typeof BUCKET_LABELS>).map((bucket) => (
          <StatCard
            key={bucket}
            label={BUCKET_LABELS[bucket]}
            value={data.aggregateOutcomes[bucket]}
            valueColor={BUCKET_COLORS[bucket]}
          />
        ))}
      </div>

      <Card className="flex flex-col gap-3">
        <Typography variant="h2">Recent activity</Typography>
        {data.recentActivity.length === 0 ? (
          <Typography variant="body" style={{ color: MUTED_TEXT_COLOR }}>
            No admin activity recorded yet.
          </Typography>
        ) : (
          <div className="flex flex-col gap-2">
            {data.recentActivity.map((entry) => (
              <div key={entry._id} className="flex items-center justify-between gap-4 text-sm">
                <Typography variant="body">
                  {entry.action} · {entry.targetType} {entry.targetId}
                </Typography>
                <Typography variant="caption">{new Date(entry.createdAt).toLocaleString()}</Typography>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
