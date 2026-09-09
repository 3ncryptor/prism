"use client";

import { Fragment, useState } from "react";
import { NSButton, NSTypography } from "@newtonschool/grauity";
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

  if (results.length === 0) {
    return <EmptyState message="No results yet. Run matching to evaluate candidates." />;
  }

  return (
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
                    <NSButton
                      variant="tertiary"
                      size="small"
                      onClick={() => setExpandedId(isExpanded ? null : result._id)}
                    >
                      {isExpanded ? "Hide evidence" : "View evidence"}
                    </NSButton>
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
  );
}
