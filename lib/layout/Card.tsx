import type { ElementType, ComponentPropsWithoutRef } from "react";

type CardProps<T extends ElementType> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

/**
 * docs/screens.md §1: the `rounded-lg border border-gray-200 p-6` wrapper
 * copy-pasted on every existing page. Polymorphic (`as`) so a form that
 * needs this exact look (e.g. the skill taxonomy create/edit form) can
 * render as a real `<form>` element instead of nesting a `<form>` inside
 * an extra `<div>`.
 */
export function Card<T extends ElementType = "div">({ as, className = "", ...rest }: CardProps<T>) {
  const Component = as ?? "div";
  return <Component className={`rounded-lg border border-gray-200 bg-white p-6 ${className}`} {...rest} />;
}
