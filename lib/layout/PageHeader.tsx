import type { ReactNode } from "react";
import { NSTypography } from "@newtonschool/grauity";

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

/** docs/screens.md §1: replaces the repeated title+action-buttons-row markup on every existing dashboard. */
export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <NSTypography variant="heading-sb-h2" as="h1">
        {title}
      </NSTypography>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
