import type { ElementType, ComponentPropsWithoutRef } from "react";

type CardProps<T extends ElementType> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

/**
 * buildPlan.md §120 (feature 27j): moved from `rounded-lg` to the new
 * `rounded-card` (2rem, soft-motion-ui-v2 §2) + diffuse shadow token
 * instead of a hard border-only look. Polymorphic (`as`) so a form that
 * needs this exact look (e.g. the skill taxonomy create/edit form) can
 * render as a real `<form>` element instead of nesting a `<form>` inside
 * an extra `<div>`.
 */
export function Card<T extends ElementType = "div">({ as, className = "", ...rest }: CardProps<T>) {
  const Component = as ?? "div";
  return (
    <Component
      className={`rounded-card border border-gray-200 bg-white p-6 shadow-[var(--shadow-card-rest)] ${className}`}
      {...rest}
    />
  );
}
