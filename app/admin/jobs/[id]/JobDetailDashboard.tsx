"use client";

import { useEffect, useState } from "react";
import { NSAlert, NSButton, NSTypography } from "@newtonschool/grauity";
import type { Job } from "@/lib/schemas/job";
import type { MatchRun } from "@/lib/schemas/matchRun";
import { MUTED_TEXT_COLOR } from "@/lib/grauityTheme";
import { ResultTable, type EnrichedMatchResult } from "@/app/admin/jobs/[id]/ResultTable";

const POLL_INTERVAL_MS = 3000;
const NON_TERMINAL_STATUSES: MatchRun["status"][] = ["QUEUED", "RUNNING"];

interface JobDetailDashboardProps {
  adminName: string;
  adminEmail: string;
  job: Job;
  initialLatestRun: MatchRun | null;
  initialBucketCounts: Record<"BEST_FIT" | "MODERATE_FIT" | "LOW_FIT", number> | null;
  onSignOut: () => void;
}

interface ResultsResponse {
  run: MatchRun;
  results: EnrichedMatchResult[];
}

export function JobDetailDashboard({
  adminName,
  adminEmail,
  job,
  initialLatestRun,
  initialBucketCounts,
  onSignOut,
}: JobDetailDashboardProps) {
  const [latestRun, setLatestRun] = useState(initialLatestRun);
  const [bucketCounts, setBucketCounts] = useState(initialBucketCounts);
  const [results, setResults] = useState<EnrichedMatchResult[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const isRunning = latestRun ? NON_TERMINAL_STATUSES.includes(latestRun.status) : false;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <header className="flex items-center justify-between gap-4">
          <div>
            <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
              {adminName} · {adminEmail}
            </NSTypography>
          </div>
          <form action={onSignOut}>
            <NSButton variant="tertiary" type="submit">
              Sign out
            </NSButton>
          </form>
        </header>

        <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <NSTypography variant="heading-sb-h2" as="h1">
            {job.title}
          </NSTypography>
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

          <div className="pt-2">
            <NSButton
              variant="primary"
              loading={isTriggering || isRunning}
              disabled={job.status !== "READY"}
              onClick={handleRunMatching}
            >
              {latestRun ? "Re-run Matching" : "Run Matching"}
            </NSButton>
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
        </section>

        <section className="flex flex-col gap-3">
          <NSTypography variant="heading-sb-h4" as="h2">
            Results
          </NSTypography>
          <ResultTable results={results} />
        </section>
      </div>
    </div>
  );
}
