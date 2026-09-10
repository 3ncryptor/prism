import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

type TypographyVariant = "h1" | "h2" | "h3" | "body" | "caption";

const VARIANT_CLASSES: Record<TypographyVariant, string> = {
  h1: "text-3xl font-bold tracking-tight text-gray-900",
  h2: "text-xl font-semibold text-gray-900",
  h3: "text-base font-semibold text-gray-900",
  body: "text-sm text-gray-700",
  caption: "text-xs text-gray-500",
};

const DEFAULT_TAG: Record<TypographyVariant, ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  body: "p",
  caption: "p",
};

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  as?: ElementType;
}

/** buildPlan.md §120 (feature 27i). Fixes the type scale — replaces Grauity's NSTypography. */
export function Typography({ variant = "body", as, className, ...props }: TypographyProps) {
  const Tag = as ?? DEFAULT_TAG[variant];
  return <Tag className={cn(VARIANT_CLASSES[variant], className)} {...props} />;
}
