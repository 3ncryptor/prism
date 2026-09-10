import { Card } from "@/lib/layout/Card";
import { Typography } from "@/lib/ui/Typography";
import { MUTED_TEXT_COLOR } from "@/lib/designTokens";

interface StatCardProps {
  label: string;
  value: number | string;
  /** Bucket-colored value text (green/amber/red) — falls back to plain gray-900 when omitted. */
  valueColor?: string;
}

/**
 * buildPlan.md §120 (feature 27j). Drops the decorative icon-in-circle
 * badge this component previously rendered — it added no information
 * beyond the label already visible, and the live UI audit flagged it as
 * a likely violation of AGENTS.md's no-icons rule. `valueColor` replaces
 * it as the meaningful visual signal: the audit's other finding was that
 * Best Fit/Moderate/Low Fit counts rendered identically regardless of
 * meaning — this lets a caller tint the number by its own bucket color.
 */
export function StatCard({ label, value, valueColor }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>
        {label}
      </Typography>
      <Typography variant="h1" as="span" className="text-2xl" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </Typography>
    </Card>
  );
}
