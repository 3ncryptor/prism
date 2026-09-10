import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** buildPlan.md §120 (feature 27i). Standard cva/clsx/tailwind-merge combinator. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
