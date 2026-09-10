import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/ui/cn";

/**
 * buildPlan.md §120 (feature 27i); soft-motion-ui-v2 §7 button variant
 * matrix, wired to the --brand token instead of shadcn's --primary. Press
 * feedback (active:scale) and the focus ring come from globals.css's
 * global `button:not(:disabled)` rule + this file's focus-visible classes
 * — every button gets both with no per-instance opt-in.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        brand: "bg-brand text-white hover:bg-brand-hover",
        outline: "border border-brand text-brand hover:bg-brand-tint",
        ghost: "text-gray-700 hover:bg-gray-100",
        destructive: "bg-red-50 text-red-700 hover:bg-red-100",
        link: "h-auto p-0 text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "brand", size: "default" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
