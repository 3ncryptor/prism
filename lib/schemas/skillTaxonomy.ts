import { z } from "zod";
import { skillCategorySchema } from "@/lib/schemas/studentProfile";

/** buildPlan.md §113.3 (extends §26, §53, §90). */
export const skillTaxonomyEntrySchema = z.object({
  _id: z.string(),
  canonicalName: z.string(),
  displayName: z.string(),
  category: skillCategorySchema,
  aliases: z.array(z.string()),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type SkillTaxonomyEntry = z.infer<typeof skillTaxonomyEntrySchema>;
