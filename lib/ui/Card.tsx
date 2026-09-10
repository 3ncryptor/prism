import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Lift + border-tint on hover — only for cards that are themselves clickable (soft-motion-ui-v2 §5). */
  interactive?: boolean;
}

/** buildPlan.md §120 (feature 27i); soft-motion-ui-v2 §5 card anatomy. */
export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-gray-200 bg-white p-6 shadow-[var(--shadow-card-rest)]",
        interactive &&
          "cursor-pointer transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-brand/25 hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
      {...props}
    />
  );
}
