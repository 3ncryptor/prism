import type { SkillTaxonomyEntry } from "@/lib/schemas/skillTaxonomy";
import { skillTaxonomyRepository, type SkillTaxonomyRepository } from "@/lib/db/repositories/skillTaxonomyRepository";

/**
 * buildPlan.md §26/§113.3: exact/alias match against the curated taxonomy,
 * falling back to a plain normalized form (the pre-#13 placeholder
 * behavior) for skills the taxonomy doesn't yet cover — matching engine
 * (#17+) still needs *some* canonicalName to compare on, and an unmatched
 * skill shouldn't be silently dropped. Pure function: no I/O, deterministic,
 * testable without a DB.
 */
export function canonicalizeSkillName(rawName: string, entries: SkillTaxonomyEntry[]): string {
  const normalized = rawName.trim().toLowerCase();

  for (const entry of entries) {
    if (!entry.isActive) continue;
    if (entry.canonicalName.toLowerCase() === normalized) return entry.canonicalName;
    if (entry.displayName.toLowerCase() === normalized) return entry.canonicalName;
    if (entry.aliases.some((alias) => alias.toLowerCase() === normalized)) {
      return entry.canonicalName;
    }
  }

  return normalized;
}

export class SkillTaxonomyService {
  constructor(private readonly taxonomy: Pick<SkillTaxonomyRepository, "listActive">) {}

  async canonicalize(rawName: string): Promise<string> {
    const entries = await this.taxonomy.listActive();
    return canonicalizeSkillName(rawName, entries);
  }
}

export const skillTaxonomyService = new SkillTaxonomyService(skillTaxonomyRepository);
