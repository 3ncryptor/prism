import type { JSX, SVGProps } from "react";

/**
 * docs/screens.md §6 — feature 27a2: hand-authored inline SVGs, no icon
 * library/font and no Grauity `Icon` component (per explicit instruction).
 * Built from simple primitives (rect/line/circle) rather than freehand
 * bezier curves, which are easy to get subtly wrong without a live preview.
 * Consistent outline style: stroke="currentColor", so color follows the
 * parent's text color.
 */
const DEFAULT_PROPS: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function BriefcaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...DEFAULT_PROPS} {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="3" y1="13" x2="21" y2="13" />
    </svg>
  );
}

export function ListIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...DEFAULT_PROPS} {...props}>
      <circle cx="4.5" cy="6" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="0.75" fill="currentColor" stroke="none" />
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
    </svg>
  );
}

export function SlidersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...DEFAULT_PROPS} {...props}>
      <line x1="6" y1="4" x2="6" y2="20" />
      <circle cx="6" cy="9" r="2" fill="currentColor" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <circle cx="12" cy="16" r="2" fill="currentColor" />
      <line x1="18" y1="4" x2="18" y2="20" />
      <circle cx="18" cy="7" r="2" fill="currentColor" />
    </svg>
  );
}

export function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...DEFAULT_PROPS} {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function DocumentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...DEFAULT_PROPS} {...props}>
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M15 3v4h4" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="16" y2="16" />
    </svg>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...DEFAULT_PROPS} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function BarChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...DEFAULT_PROPS} {...props}>
      <rect x="4" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="7" width="4" height="13" rx="1" />
      <rect x="16" y="3" width="4" height="17" rx="1" />
    </svg>
  );
}

export type IconName = "jobs" | "skillTaxonomy" | "scoringConfig" | "dashboard" | "applications";

/**
 * Nav items are defined in a Server Component (app/admin/layout.tsx,
 * app/student/layout.tsx) and passed as a prop to a Client Component
 * (Sidebar) — this project already hit a real bug once from passing a raw
 * function across that boundary. A component reference has the same
 * problem in spirit, so nav items carry a plain string `IconName` key;
 * only this lookup (used inside the already-client Sidebar) resolves it
 * to an actual icon component.
 */
export const ICONS_BY_NAME: Record<IconName, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  jobs: BriefcaseIcon,
  skillTaxonomy: ListIcon,
  scoringConfig: SlidersIcon,
  dashboard: GridIcon,
  applications: DocumentIcon,
};
