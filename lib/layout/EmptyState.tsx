import { NSTypography } from "@newtonschool/grauity";
import { MUTED_TEXT_COLOR } from "@/lib/grauityTheme";

interface EmptyStateProps {
  message: string;
}

/** docs/screens.md §1: shared "no jobs yet" / "no resumes yet" / "no applications yet" placeholder. */
export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 py-12">
      <NSTypography variant="paragraph-md-p2" color={MUTED_TEXT_COLOR}>
        {message}
      </NSTypography>
    </div>
  );
}
