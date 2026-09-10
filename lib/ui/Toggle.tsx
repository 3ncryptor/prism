"use client";

import { cn } from "@/lib/ui/cn";

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
}

/**
 * buildPlan.md §120 (feature 27m follow-up, user feedback 2026-09-10):
 * an on/off state the student actively flips (publish for matching) reads
 * more clearly as a switch than a checkbox — same semantics (role="switch"
 * mirrors a native checkbox's aria-checked-style state), just the visual
 * a user expects for this kind of toggle.
 */
export function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand" : "bg-gray-300",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-150 ease-out",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
