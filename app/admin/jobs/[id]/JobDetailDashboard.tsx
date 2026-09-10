"use client";

import { useEffect, useState } from "react";
import { NSAlert, NSButton, NSTypography } from "@newtonschool/grauity";
import type { Job } from "@/lib/schemas/job";
import type { JobProfile } from "@/lib/schemas/jobProfile";
import type { MatchRun } from "@/lib/schemas/matchRun";
import { MUTED_TEXT_COLOR, BRAND_COLOR } from "@/lib/grauityTheme";
import { ResultTable, type EnrichedMatchResult } from "@/app/admin/jobs/[id]/ResultTable";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";
import { StatCard } from "@/lib/layout/StatCard";

const POLL_INTERVAL_MS = 3000;
const NON_TERMINAL_STATUSES: MatchRun["status"][] = ["QUEUED", "RUNNING"];
const LEADERBOARD_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50];

interface JobDetailDashboardProps {
  job: Job;
  jobProfile: JobProfile | null;
  initialLatestRun: MatchRun | null;
  initialBucketCounts: Record<"BEST_FIT" | "MODERATE_FIT" | "LOW_FIT", number> | null;
}

interface ResultsResponse {
  run: MatchRun;
  results: EnrichedMatchResult[];
}

function formatDegreeList(degree: string[]): string {
  return degree.join(" / ");
}

/** docs/screens.md §4.10 (feature 27c): "Parsed JD Profile" — nothing today shows an admin the structured requirements. */
function ParsedProfileSection({ jobProfile }: { jobProfile: JobProfile }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex items-center justify-between text-left"
      >
        <NSTypography variant="heading-sb-h4" as="h2">
          Parsed JD Profile
        </NSTypography>
        <NSTypography variant="paragraph-sb-p3" color={BRAND_COLOR}>
          {isExpanded ? "Hide" : "Show"}
        </NSTypography>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-3">
          {jobProfile.requiredSkills.length > 0 && (
            <div>
              <NSTypography variant="paragraph-sb-l1" color={MUTED_TEXT_COLOR}>
                Required skills
              </NSTypography>
              <NSTypography variant="paragraph-md-p3">
                {jobProfile.requiredSkills.map((s) => s.name).join(", ")}
              </NSTypography>
            </div>
          )}
          {jobProfile.preferredSkills.length > 0 && (
            <div>
              <NSTypography variant="paragraph-sb-l1" color={MUTED_TEXT_COLOR}>
                Preferred skills
              </NSTypography>
              <NSTypography variant="paragraph-md-p3">
                {jobProfile.preferredSkills.map((s) => s.name).join(", ")}
              </NSTypography>
            </div>
          )}
          {jobProfile.requiredExperience && (
            <div>
              <NSTypography variant="paragraph-sb-l1" color={MUTED_TEXT_COLOR}>
                Experience
              </NSTypography>
              <NSTypography variant="paragraph-md-p3">
                {jobProfile.requiredExperience.minMonths}+ months
                {jobProfile.requiredExperience.domain ? `, domain "${jobProfile.requiredExperience.domain}"` : ""}
              </NSTypography>
            </div>
          )}
          {jobProfile.educationRequirements && jobProfile.educationRequirements.length > 0 && (
            <div>
              <NSTypography variant="paragraph-sb-l1" color={MUTED_TEXT_COLOR}>
                Education
              </NSTypography>
              {jobProfile.educationRequirements.map((req, index) => (
                <NSTypography key={index} variant="paragraph-md-p3">
                  {formatDegreeList(req.degree)}
                  {req.field ? `, ${formatDegreeList(req.field)}` : ""}
                  {req.minCgpa ? `, CGPA ≥ ${req.minCgpa}` : ""}
                </NSTypography>
              ))}
            </div>
          )}
          <div>
            <NSTypography variant="paragraph-sb-l1" color={MUTED_TEXT_COLOR}>
              Responsibilities
            </NSTypography>
            <NSTypography variant="paragraph-md-p3" color={jobProfile.responsibilities.length === 0 ? MUTED_TEXT_COLOR : undefined}>
              {jobProfile.responsibilities.length > 0 ? jobProfile.responsibilities.join("; ") : "(none extracted)"}
            </NSTypography>
          </div>
        </div>
      )}
    </Card>
  );
}

export function JobDetailDashboard({
  job,
  jobProfile,
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
  const [listingStatus, setListingStatus] = useState(job.listingStatus);
  const [isTogglingListing, setIsTogglingListing] = useState(false);
  const [leaderboardSize, setLeaderboardSize] = useState(job.leaderboardSize);
  const [showAllResults, setShowAllResults] = useState(false);

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

  async function handleToggleListing() {
    setError(null);
    setIsTogglingListing(true);
    try {
      const nextStatus = listingStatus === "LIVE" ? "DRAFT" : "LIVE";
      const response = await fetch(`/api/admin/jobs/${job._id}/listing-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingStatus: nextStatus }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to update listing status.");
      }
      setListingStatus(body.listingStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing status.");
    } finally {
      setIsTogglingListing(false);
    }
  }

  async function handleLeaderboardSizeChange(size: number) {
    setLeaderboardSize(size);
    try {
      await fetch(`/api/admin/jobs/${job._id}/leaderboard-size`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderboardSize: size }),
      });
    } catch {
      // Best-effort persistence; the selector already reflects the chosen
      // value locally, and it's a low-stakes admin preference, not data
      // that needs a hard failure surface.
    }
  }

  const isRunning = latestRun ? NON_TERMINAL_STATUSES.includes(latestRun.status) : false;
  const isCurrentRunPublished = Boolean(latestRun && publishedMatchRunId === latestRun._id);
  const isLive = listingStatus === "LIVE";
  const visibleResults = showAllResults ? results : results.slice(0, leaderboardSize);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title={job.title} />

      <Card className="flex flex-col gap-3 bg-gray-50">
          <div className="flex items-center justify-between">
            {job.company && (
              <NSTypography variant="paragraph-md-p2" color={MUTED_TEXT_COLOR}>
                {job.company}
              </NSTypography>
            )}
            <div className="flex items-center gap-2">
              <NSTypography variant="paragraph-sb-p3" color={isLive ? BRAND_COLOR : MUTED_TEXT_COLOR}>
                Listing: {isLive ? "Live" : "Draft"}
              </NSTypography>
              <NSButton variant="tertiary" size="small" loading={isTogglingListing} onClick={handleToggleListing}>
                {isLive ? "Set to Draft" : "Make Live"}
              </NSButton>
            </div>
          </div>

          {bucketCounts && (
            <div className="grid grid-cols-3 gap-4 pt-2">
              <StatCard label="Best Fit" value={bucketCounts.BEST_FIT} icon="dashboard" />
              <StatCard label="Moderate" value={bucketCounts.MODERATE_FIT} icon="dashboard" />
              <StatCard label="Low Fit" value={bucketCounts.LOW_FIT} icon="dashboard" />
            </div>
          )}

          <NSTypography variant="paragraph-sb-l1" color={MUTED_TEXT_COLOR}>
            Results: {publishedMatchRunId ? "Published to students" : "Hidden from students"}
          </NSTypography>

          <div className="flex items-center gap-3 pt-2">
            <NSButton
              variant="primary"
              loading={isTriggering || isRunning}
              disabled={job.status !== "READY" || !isLive}
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
            {job.status === "READY" && !isLive && (
              <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                Make this listing Live to run matching.
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

      {jobProfile && <ParsedProfileSection jobProfile={jobProfile} />}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <NSTypography variant="heading-sb-h4" as="h2">
            Results
          </NSTypography>
          {results.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Show top
              <select
                className="rounded border border-gray-300 px-2 py-1"
                value={leaderboardSize}
                onChange={(e) => handleLeaderboardSizeChange(Number(e.target.value))}
              >
                {LEADERBOARD_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <ResultTable results={visibleResults} />
        {!showAllResults && results.length > leaderboardSize && (
          <button
            type="button"
            onClick={() => setShowAllResults(true)}
            className="self-start text-sm font-medium"
            style={{ color: BRAND_COLOR }}
          >
            Show all {results.length} candidates
          </button>
        )}
      </div>
    </div>
  );
}
