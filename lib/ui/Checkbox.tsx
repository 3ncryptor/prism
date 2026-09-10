import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

/**
 * buildPlan.md §120 (feature 27i). Styles the native checkbox (via
 * accent-color) rather than replacing it with a custom div — keeps the
 * browser's own keyboard/screen-reader semantics instead of reinventing
 * them. Closes the "unstyled native checkbox" finding from the live audit.
 */
export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 cursor-pointer rounded border-gray-300 accent-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
      {...props}
    />
  );
}
