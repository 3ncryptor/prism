import type { SkillTaxonomyEntry } from "@/lib/schemas/skillTaxonomy";
import { skillTaxonomyRepository, type SkillTaxonomyRepository } from "@/lib/db/repositories/skillTaxonomyRepository";
import { studentProfileRepository, type StudentProfileRepository } from "@/lib/db/repositories/studentProfileRepository";
import { jobProfileRepository, type JobProfileRepository } from "@/lib/db/repositories/jobProfileRepository";

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

export interface SkillTaxonomyEntryWithUsage extends SkillTaxonomyEntry {
  usageCount: number;
}

export class DuplicateCanonicalNameError extends Error {
  constructor(canonicalName: string) {
    super(`A skill with canonical name "${canonicalName}" already exists`);
    this.name = "DuplicateCanonicalNameError";
  }
}

export class SkillNotFoundError extends Error {
  constructor() {
    super("Skill not found");
    this.name = "SkillNotFoundError";
  }
}

type AdminDeps = {
  taxonomy: Pick<SkillTaxonomyRepository, "list" | "getById" | "create" | "update" | "deactivate">;
  studentProfiles: Pick<StudentProfileRepository, "countReferencingSkill">;
  jobProfiles: Pick<JobProfileRepository, "countReferencingSkill">;
};

const defaultAdminDeps: AdminDeps = {
  taxonomy: skillTaxonomyRepository,
  studentProfiles: studentProfileRepository,
  jobProfiles: jobProfileRepository,
};

/** buildPlan.md §116: table of canonical skills with a usage count each. */
export async function listSkillsWithUsage(
  deps: AdminDeps = defaultAdminDeps,
): Promise<SkillTaxonomyEntryWithUsage[]> {
  const entries = await deps.taxonomy.list();
  return Promise.all(
    entries.map(async (entry) => {
      const [studentCount, jobCount] = await Promise.all([
        deps.studentProfiles.countReferencingSkill(entry.canonicalName),
        deps.jobProfiles.countReferencingSkill(entry.canonicalName),
      ]);
      return { ...entry, usageCount: studentCount + jobCount };
    }),
  );
}

export async function createSkill(
  input: {
    canonicalName: string;
    displayName: string;
    category: SkillTaxonomyEntry["category"];
    aliases: string[];
    createdBy: string;
  },
  deps: AdminDeps = defaultAdminDeps,
): Promise<SkillTaxonomyEntry> {
  const existing = await deps.taxonomy.list();
  if (existing.some((entry) => entry.canonicalName === input.canonicalName)) {
    throw new DuplicateCanonicalNameError(input.canonicalName);
  }
  return deps.taxonomy.create(input);
}

export async function updateSkill(
  id: string,
  patch: Partial<Pick<SkillTaxonomyEntry, "displayName" | "category" | "aliases">>,
  deps: AdminDeps = defaultAdminDeps,
): Promise<SkillTaxonomyEntry> {
  const updated = await deps.taxonomy.update(id, patch);
  if (!updated) throw new SkillNotFoundError();
  return updated;
}

/** buildPlan.md §116: soft-delete only, never a hard delete. */
export async function deactivateSkill(id: string, deps: AdminDeps = defaultAdminDeps): Promise<void> {
  const existing = await deps.taxonomy.getById(id);
  if (!existing) throw new SkillNotFoundError();
  await deps.taxonomy.deactivate(id);
}
