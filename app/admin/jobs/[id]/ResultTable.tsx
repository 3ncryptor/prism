"use client";

import { Fragment, useState } from "react";
import type { MatchResult } from "@/lib/schemas/matchResult";
import { MUTED_TEXT_COLOR } from "@/lib/designTokens";
import { EvidenceList } from "@/app/shared/EvidenceList";
import { BucketPill } from "@/lib/layout/BucketPill";
import { EmptyState } from "@/lib/layout/EmptyState";
import { Typography } from "@/lib/ui/Typography";
import { Button } from "@/lib/ui/Button";
import { useStagger } from "@/lib/motion/useStagger";

export type EnrichedMatchResult = MatchResult & { studentName: string; studentEmail: string };

interface ResultTableProps {
  results: EnrichedMatchResult[];
}

/**
 * buildPlan.md §85: Rank/Student/Score/Confidence/Bucket/Missing
 * requirements. Visual pass in docs/screens.md §8.8 (feature 27o):
 * migrated off Grauity, rows get a hover state + useStagger on first
 * render.
 */
export function ResultTable({ results }: ResultTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const bodyRef = useStagger<HTMLTableSectionElement>([results.length]);

  if (results.length === 0) {
    return <EmptyState message="No results yet. Run matching to evaluate candidates." />;
  }

  async function handleViewResume(resumeId: string) {
    setResumeError(null);
    try {
      const response = await fetch(`/api/admin/resumes/${resumeId}/file-url`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to open resume.");
      window.open(body.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : "Failed to open resume.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {resumeError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {resumeError}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {["Rank", "Student", "Score", "Confidence", "Bucket", "Missing requirements", ""].map((heading) => (
              <th key={heading} className="px-4 py-3">
                <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>
                  {heading}
                </Typography>
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={bodyRef}>
          {results.map((result, index) => {
            const isExpanded = expandedId === result._id;
            return (
              <Fragment key={result._id}>
                <tr className="border-b border-gray-100 transition-colors duration-150 ease-out last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Typography variant="body">{index + 1}</Typography>
                  </td>
                  <td className="px-4 py-3">
                    <Typography variant="body" className="font-semibold">
                      {result.studentName}
                    </Typography>
                    <Typography variant="caption">{result.studentEmail}</Typography>
                  </td>
                  <td className="px-4 py-3">
                    <Typography variant="body">{result.score.toFixed(1)}</Typography>
                  </td>
                  <td className="px-4 py-3">
                    <Typography variant="body">{result.confidence.toFixed(0)}%</Typography>
                  </td>
                  <td className="px-4 py-3">
                    <BucketPill bucket={result.bucket} />
                  </td>
                  <td className="px-4 py-3">
                    <Typography variant="caption">
                      {result.missingRequirements.length > 0 ? result.missingRequirements.join(", ") : "—"}
                    </Typography>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setExpandedId(isExpanded ? null : result._id)}>
                        {isExpanded ? "Hide evidence" : "View evidence"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleViewResume(result.resumeId)}>
                        View resume file
                      </Button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-b border-gray-100 bg-gray-50 last:border-0">
                    <td colSpan={7} className="px-4 py-3">
                      <EvidenceList evidence={result.evidence} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
