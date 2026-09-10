"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Typography } from "@/lib/ui/Typography";
import { cn } from "@/lib/ui/cn";
import { useActiveIndicator } from "@/lib/motion/useActiveIndicator";

export interface SidebarNavItem {
  label: string;
  href: string;
  /**
   * Extra path prefixes that should also count as "active" for this item
   * — needed for "Jobs" (href `/admin`), which must also light up on
   * `/admin/jobs/[id]`. Declarative (plain strings) rather than a
   * predicate function: this list is defined in a Server Component
   * (app/admin/layout.tsx) and passed as a prop to a Client Component,
   * and functions aren't serializable across that boundary.
   */
  matchPrefixes?: string[];
}

interface SidebarProps {
  items: SidebarNavItem[];
}

function matchesPrefix(prefix: string, pathname: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Exact match on `href` always counts. Sub-path matching is opt-in via
 * `matchPrefixes` rather than automatically expanding `href` itself —
 * "Jobs" has `href: "/admin"`, and auto-expanding that into a prefix
 * match would make it (wrongly) light up on every other `/admin/*` page.
 */
function isItemActive(item: SidebarNavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  return item.matchPrefixes?.some((prefix) => matchesPrefix(prefix, pathname)) ?? false;
}

/**
 * buildPlan.md §120 (feature 27j): migrated off Grauity's NSTypography;
 * the active-item highlight is now a GSAP-animated sliding indicator
 * (lib/motion/useActiveIndicator, ports soft-motion-ui-v2 §8's Framer
 * `layoutId` nav underline to GSAP) instead of a flat background swap.
 * Still plain CSS transitions (150ms) for hover — per emil-design-eng,
 * sidebar items are clicked many times a day, so hover feedback stays
 * fast/cheap rather than elaborate.
 */
export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  const activeItemRef = useRef<HTMLAnchorElement>(null);
  const activeIndex = items.findIndex((item) => isItemActive(item, pathname));
  const indicatorRef = useActiveIndicator(activeItemRef, [activeIndex]);

  return (
    // A plain <nav> renders here as display:block despite the `flex`
    // utility: Grauity's CSS is imported unlayered (plain @import, not
    // inside a Tailwind @layer), and per the CSS cascade-layers spec,
    // ANY unlayered rule beats ANY layered one regardless of specificity
    // — Grauity's semantic-element reset (nav/header/etc -> block) wins
    // over Tailwind's layered `.flex` utility. `role="navigation"` keeps
    // the same accessibility semantics without hitting that reset.
    <div role="navigation" className="relative flex w-56 shrink-0 flex-col gap-1 border-r border-gray-200 bg-gray-50 p-4">
      <span
        ref={indicatorRef}
        aria-hidden
        className="pointer-events-none absolute left-4 right-4 z-0 rounded-md bg-brand-tint"
        style={{ top: 0, height: 0 }}
      />
      {items.map((item) => {
        const isActive = isItemActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            ref={isActive ? activeItemRef : undefined}
            className={cn(
              "relative z-10 rounded-md px-3 py-2 transition-colors duration-150 ease-out",
              !isActive && "hover:bg-gray-200",
            )}
          >
            <Typography variant="body" as="span" className={isActive ? "font-semibold text-brand" : undefined}>
              {item.label}
            </Typography>
          </Link>
        );
      })}
    </div>
  );
}
