import { NSTypography } from "@newtonschool/grauity";
import type { MatchEvidenceDoc } from "@/lib/schemas/matchResult";
import { MUTED_TEXT_COLOR } from "@/lib/grauityTheme";

const CATEGORY_LABEL: Record<MatchEvidenceDoc["category"], string> = {
  SKILL: "Skill",
  EXPERIENCE: "Experience",
  PROJECT: "Project",
  EDUCATION: "Education",
  REQUIREMENT: "Requirement",
};

interface EvidenceListProps {
  evidence: MatchEvidenceDoc[];
}

/** buildPlan.md §37 — feature #23: renders a MatchResult's per-requirement evidence trail. */
export function EvidenceList({ evidence }: EvidenceListProps) {
  if (evidence.length === 0) {
    return (
      <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
        No evidence recorded for this match.
      </NSTypography>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {evidence.map((item, index) => (
        <div key={index} className="rounded border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <NSTypography variant="paragraph-sb-p3" as="span">
              {CATEGORY_LABEL[item.category]}: {item.requirement}
            </NSTypography>
            <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
              {item.score.toFixed(2)}
            </NSTypography>
          </div>
          {item.matchedEvidence && (
            <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
              Matched: {item.matchedEvidence}
              {item.sourceType ? ` (${item.sourceType})` : ""}
            </NSTypography>
          )}
          <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
            {item.reason}
          </NSTypography>
        </div>
      ))}
    </div>
  );
}
