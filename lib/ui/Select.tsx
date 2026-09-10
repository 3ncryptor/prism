import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

/** buildPlan.md §120 (feature 27i). */
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
      {...props}
    />
  );
}
