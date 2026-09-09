import { NSPill, NSTypography } from "@newtonschool/grauity";
import type { MatchResult } from "@/lib/schemas/matchResult";
import { MUTED_TEXT_COLOR } from "@/lib/grauityTheme";

export type EnrichedMatchResult = MatchResult & { studentName: string; studentEmail: string };

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

interface ResultTableProps {
  results: EnrichedMatchResult[];
}

/** buildPlan.md §85: Rank/Student/Score/Confidence/Bucket/Missing requirements. */
export function ResultTable({ results }: ResultTableProps) {
  if (results.length === 0) {
    return (
      <NSTypography variant="paragraph-md-p2" color={MUTED_TEXT_COLOR}>
        No results yet. Run matching to evaluate candidates.
      </NSTypography>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {["Rank", "Student", "Score", "Confidence", "Bucket", "Missing requirements"].map((heading) => (
              <th key={heading} className="px-4 py-3">
                <NSTypography variant="paragraph-sb-l1" color={MUTED_TEXT_COLOR}>
                  {heading}
                </NSTypography>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr key={result._id} className="border-b border-gray-100 last:border-0">
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
                <NSPill color={BUCKET_COLOR[result.bucket]} isActive>
                  {BUCKET_LABEL[result.bucket]}
                </NSPill>
              </td>
              <td className="px-4 py-3">
                <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                  {result.missingRequirements.length > 0 ? result.missingRequirements.join(", ") : "—"}
                </NSTypography>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
