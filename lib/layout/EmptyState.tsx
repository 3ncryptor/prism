import { Typography } from "@/lib/ui/Typography";
import { MUTED_TEXT_COLOR } from "@/lib/designTokens";

interface EmptyStateProps {
  message: string;
}

/** buildPlan.md §120 (feature 27j): migrated off Grauity's NSTypography onto lib/ui/Typography. */
export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 py-12">
      <Typography variant="body" style={{ color: MUTED_TEXT_COLOR }}>
        {message}
      </Typography>
    </div>
  );
}
