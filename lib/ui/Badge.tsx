import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Status/semantic tones. For color-as-data (per-role) badges, pass tone="neutral" and override with className/style instead. */
  tone?: "brand" | "success" | "error" | "warning" | "neutral";
}

const TONE_CLASSES: Record<NonNullable<BadgeProps["tone"]>, string> = {
  brand: "bg-brand-tint text-brand",
  success: "bg-green-50 text-green-700",
  error: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-700",
  neutral: "bg-gray-100 text-gray-700",
};

/** buildPlan.md §120 (feature 27i). */
export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", TONE_CLASSES[tone], className)}
      {...props}
    />
  );
}
