import { z } from "zod";

/**
 * docs/screens.md §4.11 (feature 27e). Deliberately near-identical to
 * skillTaxonomy.ts (buildPlan.md §113.3) minus category/aliases — job
 * roles are a flat, admin-managed list, not a categorized taxonomy.
 * `canonicalName` is always normalized (trim + lowercase) at the API
 * boundary so "Data Science" and "DATA SCIENCE" can never coexist as two
 * different tags — the standardization the user explicitly asked for.
 */
export const jobRoleTaxonomyEntrySchema = z.object({
  _id: z.string(),
  canonicalName: z.string(),
  displayName: z.string(),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type JobRoleTaxonomyEntry = z.infer<typeof jobRoleTaxonomyEntrySchema>;
