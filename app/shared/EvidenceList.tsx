import { Typography } from "@/lib/ui/Typography";
import type { MatchEvidenceDoc } from "@/lib/schemas/matchResult";
import { MUTED_TEXT_COLOR } from "@/lib/designTokens";

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
      <Typography variant="body" style={{ color: MUTED_TEXT_COLOR }}>
        No evidence recorded for this match.
      </Typography>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {evidence.map((item, index) => (
        <div key={index} className="rounded border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <Typography variant="body" as="span" className="font-semibold">
              {CATEGORY_LABEL[item.category]}: {item.requirement}
            </Typography>
            <Typography variant="caption">{item.score.toFixed(2)}</Typography>
          </div>
          {item.matchedEvidence && (
            <Typography variant="caption">
              Matched: {item.matchedEvidence}
              {item.sourceType ? ` (${item.sourceType})` : ""}
            </Typography>
          )}
          <Typography variant="caption">{item.reason}</Typography>
        </div>
      ))}
    </div>
  );
}
