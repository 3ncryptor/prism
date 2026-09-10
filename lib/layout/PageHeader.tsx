import type { ReactNode } from "react";
import { Typography } from "@/lib/ui/Typography";

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

/** buildPlan.md §120 (feature 27j): migrated off Grauity's NSTypography onto lib/ui/Typography. */
export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Typography variant="h1" as="h1">
        {title}
      </Typography>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
