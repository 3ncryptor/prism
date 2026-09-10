"use client";

import { useEffect, useRef, useState } from "react";
import { Typography } from "@/lib/ui/Typography";
import { BRAND_COLOR, MUTED_TEXT_COLOR } from "@/lib/designTokens";
import { ChevronDownIcon } from "@/lib/layout/icons";

interface TopBarProps {
  name: string;
  email: string;
  onSignOut: () => Promise<void>;
}

/**
 * buildPlan.md §120 (feature 27j): migrated off Grauity's NSTypography
 * onto lib/ui/Typography + lib/designTokens — same avatar-chip + dropdown
 * behavior as before (docs/screens.md §6.2), no functional change.
 */
export function TopBar({ name, email, onSignOut }: TopBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    // role="banner" instead of a plain <header> — see the same cascade-
    // layer note in Sidebar.tsx (Grauity's CSS resets nav/header/etc to
    // display:block, unlayered, which beats Tailwind's layered `flex`).
    <div role="banner" className="relative flex items-center justify-end border-b border-gray-200 bg-white px-6 py-3">
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 ease-out hover:bg-gray-100"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            {initial}
          </span>
          <span className="flex flex-col items-start">
            <Typography variant="body" as="span" className="font-semibold">
              {name}
            </Typography>
            <Typography variant="caption" as="span" style={{ color: MUTED_TEXT_COLOR }}>
              {email}
            </Typography>
          </span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full z-10 mt-2 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
            <form action={onSignOut}>
              <button
                type="submit"
                className="w-full rounded-md px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-gray-100"
              >
                <Typography variant="body" as="span" className="font-semibold">
                  Sign out
                </Typography>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
