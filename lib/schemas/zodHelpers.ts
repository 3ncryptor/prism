import { z } from "zod";

/**
 * LLM providers (instructed by our own prompts to use `null` for absent
 * optional fields, per standard JSON convention) return `null`, not
 * `undefined` — `.optional()` alone rejects `null` (found the hard way in
 * feature #8's studentProfile schema; applying the same fix everywhere
 * up front for jobProfile, per buildPlan.md §118 addendum's "prefer
 * evidence over memory" spirit — don't wait to rediscover the same bug).
 * Accepts either, normalizes to `undefined` so `field?: T` types hold.
 */
export function nullish<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .nullish()
    .transform((value) => value ?? undefined) as unknown as z.ZodOptional<T>;
}
