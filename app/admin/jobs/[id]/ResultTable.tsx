"use client";

import { Fragment, useState } from "react";
import { NSAlert, NSButton, NSTypography } from "@newtonschool/grauity";
import type { MatchResult } from "@/lib/schemas/matchResult";
import { MUTED_TEXT_COLOR } from "@/lib/grauityTheme";
import { EvidenceList } from "@/app/shared/EvidenceList";
import { BucketPill } from "@/lib/layout/BucketPill";
import { EmptyState } from "@/lib/layout/EmptyState";

export type EnrichedMatchResult = MatchResult & { studentName: string; studentEmail: string };

interface ResultTableProps {
  results: EnrichedMatchResult[];
}

/** buildPlan.md §85: Rank/Student/Score/Confidence/Bucket/Missing requirements. */
export function ResultTable({ results }: ResultTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  if (results.length === 0) {
    return <EmptyState message="No results yet. Run matching to evaluate candidates." />;
  }

  async function handleViewResume(studentId: string) {
    setResumeError(null);
    try {
      const response = await fetch(`/api/admin/students/${studentId}/resume-url`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to open resume.");
      window.open(body.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : "Failed to open resume.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {resumeError && <NSAlert variant="error" icon={null} description={resumeError} />}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {["Rank", "Student", "Score", "Confidence", "Bucket", "Missing requirements", ""].map((heading) => (
              <th key={heading} className="px-4 py-3">
                <NSTypography variant="paragraph-sb-l1" color={MUTED_TEXT_COLOR}>
                  {heading}
                </NSTypography>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => {
            const isExpanded = expandedId === result._id;
            return (
              <Fragment key={result._id}>
                <tr className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <NSTypography variant="paragraph-md-p3">{index + 1}</NSTypography>
                  </td>
                  <td className="px-4 py-3">
                    <NSTypography variant="paragraph-sb-p3">{result.studentName}</NSTypography>
                    <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                      {result.studentEmail}
                    </NSTypography>
                  </td>
                  <td className="px-4 py-3">
                    <NSTypography variant="paragraph-md-p3">{result.score.toFixed(1)}</NSTypography>
                  </td>
                  <td className="px-4 py-3">
                    <NSTypography variant="paragraph-md-p3">{result.confidence.toFixed(0)}%</NSTypography>
                  </td>
                  <td className="px-4 py-3">
                    <BucketPill bucket={result.bucket} />
                  </td>
                  <td className="px-4 py-3">
                    <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                      {result.missingRequirements.length > 0 ? result.missingRequirements.join(", ") : "—"}
                    </NSTypography>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <NSButton
                        variant="tertiary"
                        size="small"
                        onClick={() => setExpandedId(isExpanded ? null : result._id)}
                      >
                        {isExpanded ? "Hide evidence" : "View evidence"}
                      </NSButton>
                      <NSButton
                        variant="tertiary"
                        size="small"
                        onClick={() => handleViewResume(result.studentId)}
                      >
                        View resume file
                      </NSButton>
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
