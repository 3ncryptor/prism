"use client";

import { useEffect, useState } from "react";
import { NSAlert, NSButton, NSTypography } from "@newtonschool/grauity";
import type { Job } from "@/lib/schemas/job";
import type { MatchRun } from "@/lib/schemas/matchRun";
import { MUTED_TEXT_COLOR } from "@/lib/grauityTheme";
import { ResultTable, type EnrichedMatchResult } from "@/app/admin/jobs/[id]/ResultTable";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";

const POLL_INTERVAL_MS = 3000;
const NON_TERMINAL_STATUSES: MatchRun["status"][] = ["QUEUED", "RUNNING"];

interface JobDetailDashboardProps {
  job: Job;
  initialLatestRun: MatchRun | null;
  initialBucketCounts: Record<"BEST_FIT" | "MODERATE_FIT" | "LOW_FIT", number> | null;
}

interface ResultsResponse {
  run: MatchRun;
  results: EnrichedMatchResult[];
}

export function JobDetailDashboard({
  job,
  initialLatestRun,
  initialBucketCounts,
}: JobDetailDashboardProps) {
  const [latestRun, setLatestRun] = useState(initialLatestRun);
  const [bucketCounts, setBucketCounts] = useState(initialBucketCounts);
  const [results, setResults] = useState<EnrichedMatchResult[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedMatchRunId, setPublishedMatchRunId] = useState(job.publishedMatchRunId);
  const [isPublishing, setIsPublishing] = useState(false);

  async function fetchResults(runId: string) {
    const response = await fetch(`/api/admin/jobs/${job._id}/results?runId=${runId}&includeIneligible=true`);
    if (!response.ok) return;
    const data: ResultsResponse = await response.json();
    setLatestRun(data.run);

    const counts = { BEST_FIT: 0, MODERATE_FIT: 0, LOW_FIT: 0 };
    for (const result of data.results) counts[result.bucket] += 1;
    setBucketCounts(counts);

    setResults(data.results.filter((r) => r.eligible));
  }

  useEffect(() => {
    if (!latestRun) return;
    const runId = latestRun._id;

    // Deferred (not called synchronously in the effect body) so an
    // already-COMPLETED run's results populate the table on mount, not
    // just while polling — matches the interval callback's own pattern
    // rather than setState-ing directly inside the effect body.
    const initialFetch = setTimeout(() => fetchResults(runId), 0);

    if (!NON_TERMINAL_STATUSES.includes(latestRun.status)) {
      return () => clearTimeout(initialFetch);
    }

    const intervalId = setInterval(() => {
      fetchResults(runId);
    }, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initialFetch);
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestRun?._id, latestRun?.status]);

  async function handleRunMatching() {
    setError(null);
    setIsTriggering(true);
    try {
      const response = await fetch(`/api/admin/jobs/${job._id}/match`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to start matching.");
      }
      await fetchResults(body.matchRunId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start matching.");
    } finally {
      setIsTriggering(false);
    }
  }

  async function handleTogglePublish() {
    if (!latestRun) return;
    setError(null);
    setIsPublishing(true);
    try {
      const isPublished = publishedMatchRunId === latestRun._id;
      const endpoint = isPublished
        ? `/api/admin/jobs/${job._id}/hide-results`
        : `/api/admin/jobs/${job._id}/publish-results`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: isPublished ? undefined : JSON.stringify({ matchRunId: latestRun._id }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to update publish status.");
      }
      setPublishedMatchRunId(body.publishedMatchRunId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update publish status.");
    } finally {
      setIsPublishing(false);
    }
  }

  const isRunning = latestRun ? NON_TERMINAL_STATUSES.includes(latestRun.status) : false;
  const isCurrentRunPublished = Boolean(latestRun && publishedMatchRunId === latestRun._id);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title={job.title} />

      <Card className="flex flex-col gap-3 bg-gray-50">
          {job.company && (
            <NSTypography variant="paragraph-md-p2" color={MUTED_TEXT_COLOR}>
              {job.company}
            </NSTypography>
          )}

          {bucketCounts && (
            <div className="flex gap-6 pt-2">
              <div>
                <NSTypography variant="heading-sb-h4">{bucketCounts.BEST_FIT}</NSTypography>
                <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>Best Fit</NSTypography>
              </div>
              <div>
                <NSTypography variant="heading-sb-h4">{bucketCounts.MODERATE_FIT}</NSTypography>
                <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>Moderate</NSTypography>
              </div>
              <div>
                <NSTypography variant="heading-sb-h4">{bucketCounts.LOW_FIT}</NSTypography>
                <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>Low Fit</NSTypography>
              </div>
            </div>
          )}

          <NSTypography variant="paragraph-sb-l1" color={MUTED_TEXT_COLOR}>
            Results: {publishedMatchRunId ? "Published to students" : "Hidden from students"}
          </NSTypography>

          <div className="flex items-center gap-3 pt-2">
            <NSButton
              variant="primary"
              loading={isTriggering || isRunning}
              disabled={job.status !== "READY"}
              onClick={handleRunMatching}
            >
              {latestRun ? "Re-run Matching" : "Run Matching"}
            </NSButton>
            {latestRun?.status === "COMPLETED" && (
              <NSButton variant="secondary" loading={isPublishing} onClick={handleTogglePublish}>
                {isCurrentRunPublished ? "Hide Results" : "Publish Results"}
              </NSButton>
            )}
            {latestRun?.status === "COMPLETED" && (
              <a href={`/api/admin/jobs/${job._id}/export?runId=${latestRun._id}`}>
                <NSButton variant="tertiary" type="button">
                  Export CSV
                </NSButton>
              </a>
            )}
            {job.status !== "READY" && (
              <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                This job description is still processing.
              </NSTypography>
            )}
          </div>

          {error && <NSAlert variant="error" icon={null} description={error} />}
          {latestRun?.status === "FAILED" && (
            <NSAlert
              variant="error"
              icon={null}
              title="Matching failed"
              description={latestRun.error?.message ?? "The matching run failed. Please try again."}
            />
          )}
      </Card>

      <div className="flex flex-col gap-3">
        <NSTypography variant="heading-sb-h4" as="h2">
          Results
        </NSTypography>
        <ResultTable results={results} />
      </div>
    </div>
  );
}
