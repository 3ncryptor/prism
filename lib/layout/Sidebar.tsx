"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NSTypography } from "@newtonschool/grauity";
import { BRAND_COLOR, BRAND_TINT_COLOR } from "@/lib/grauityTheme";

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
 * docs/screens.md §1/§2. Plain CSS transitions (150ms, no GSAP) for the
 * hover/active state deliberately — per the emil-design-eng skill's
 * frequency rule, sidebar items are clicked many times a day, so the
 * correct move is a fast, cheap transition, not an elaborate animation.
 */
export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();

  return (
    // A plain <nav> renders here as display:block despite the `flex`
    // utility: Grauity's CSS is imported unlayered (plain @import, not
    // inside a Tailwind @layer), and per the CSS cascade-layers spec,
    // ANY unlayered rule beats ANY layered one regardless of specificity
    // — Grauity's semantic-element reset (nav/header/etc -> block) wins
    // over Tailwind's layered `.flex` utility. `role="navigation"` keeps
    // the same accessibility semantics without hitting that reset.
    <div role="navigation" className="flex w-56 shrink-0 flex-col gap-1 border-r border-gray-200 bg-gray-50 p-4">
      {items.map((item) => {
        const isActive = isItemActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            // Background is an inline style, not a Tailwind class, on the
            // active item: Grauity ships an unlayered anchor-tag reset
            // (background-color: transparent) that otherwise beats
            // Tailwind's layered utility classes regardless of specificity
            // — see the display:block note above for the same mechanism.
            // Inline styles always win.
            className={`rounded-md px-3 py-2 transition-colors duration-150 ease-out ${!isActive ? "hover:bg-gray-200" : ""}`}
            style={isActive ? { backgroundColor: BRAND_TINT_COLOR } : undefined}
          >
            <NSTypography variant="paragraph-sb-p3" as="span" color={isActive ? BRAND_COLOR : undefined}>
              {item.label}
            </NSTypography>
          </Link>
        );
      })}
    </div>
  );
}
