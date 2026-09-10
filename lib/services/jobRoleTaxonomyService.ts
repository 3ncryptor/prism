import type { JobRoleTaxonomyEntry } from "@/lib/schemas/jobRoleTaxonomy";
import {
  jobRoleTaxonomyRepository,
  type JobRoleTaxonomyRepository,
} from "@/lib/db/repositories/jobRoleTaxonomyRepository";
import { jobRepository, type JobRepository } from "@/lib/db/repositories/jobRepository";
import { resumeRepository, type ResumeRepository } from "@/lib/db/repositories/resumeRepository";

export class DuplicateRoleNameError extends Error {
  constructor(canonicalName: string) {
    super(`A job role named "${canonicalName}" already exists`);
    this.name = "DuplicateRoleNameError";
  }
}

export class RoleNotFoundError extends Error {
  constructor() {
    super("Job role not found");
    this.name = "RoleNotFoundError";
  }
}

export interface JobRoleTaxonomyEntryWithUsage extends JobRoleTaxonomyEntry {
  usageCount: number;
}

type AdminDeps = {
  taxonomy: Pick<JobRoleTaxonomyRepository, "list" | "getById" | "create" | "update" | "deactivate">;
  jobs: Pick<JobRepository, "countReferencingRole">;
  resumes: Pick<ResumeRepository, "countReferencingRole">;
};

const defaultAdminDeps: AdminDeps = {
  taxonomy: jobRoleTaxonomyRepository,
  jobs: jobRepository,
  resumes: resumeRepository,
};

/** docs/screens.md §4.11 (feature 27e). Mirrors skillTaxonomyService.ts's admin functions. */
export async function listRolesWithUsage(
  deps: AdminDeps = defaultAdminDeps,
): Promise<JobRoleTaxonomyEntryWithUsage[]> {
  const entries = await deps.taxonomy.list();
  return Promise.all(
    entries.map(async (entry) => {
      const [jobCount, resumeCount] = await Promise.all([
        deps.jobs.countReferencingRole(entry.canonicalName),
        deps.resumes.countReferencingRole(entry.canonicalName),
      ]);
      return { ...entry, usageCount: jobCount + resumeCount };
    }),
  );
}

export async function createRole(
  input: { canonicalName: string; displayName: string; createdBy: string },
  deps: AdminDeps = defaultAdminDeps,
): Promise<JobRoleTaxonomyEntry> {
  const existing = await deps.taxonomy.list();
  if (existing.some((entry) => entry.canonicalName === input.canonicalName)) {
    throw new DuplicateRoleNameError(input.canonicalName);
  }
  return deps.taxonomy.create(input);
}

export async function updateRole(
  id: string,
  patch: Partial<Pick<JobRoleTaxonomyEntry, "displayName">>,
  deps: AdminDeps = defaultAdminDeps,
): Promise<JobRoleTaxonomyEntry> {
  const updated = await deps.taxonomy.update(id, patch);
  if (!updated) throw new RoleNotFoundError();
  return updated;
}

export async function deactivateRole(id: string, deps: AdminDeps = defaultAdminDeps): Promise<void> {
  const existing = await deps.taxonomy.getById(id);
  if (!existing) throw new RoleNotFoundError();
  await deps.taxonomy.deactivate(id);
}
