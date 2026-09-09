import { NSTypography } from "@newtonschool/grauity";
import { BRAND_COLOR, BRAND_TINT_COLOR, MUTED_TEXT_COLOR } from "@/lib/grauityTheme";
import { Card } from "@/lib/layout/Card";
import { ICONS_BY_NAME, type IconName } from "@/lib/layout/icons";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: IconName;
  href?: string;
  linkLabel?: string;
}

/**
 * docs/screens.md §6.3 (feature 27a2). `icon` is a lookup key (not a JSX
 * element/component reference) for the same reason `Sidebar`'s
 * `matchPrefixes` is a string array — this data can originate in a Server
 * Component and this keeps it serializable across that boundary.
 */
export function StatCard({ label, value, icon, href, linkLabel }: StatCardProps) {
  const Icon = icon ? ICONS_BY_NAME[icon] : null;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <NSTypography variant="paragraph-sb-l1" color={MUTED_TEXT_COLOR}>
          {label}
        </NSTypography>
        {Icon && (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: BRAND_TINT_COLOR, color: BRAND_COLOR }}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>

      <NSTypography variant="heading-sb-h3" as="span">
        {value}
      </NSTypography>

      {href && linkLabel && (
        <a href={href} style={{ color: BRAND_COLOR }} className="text-sm font-medium hover:underline">
          {linkLabel} →
        </a>
      )}
    </Card>
  );
}
