import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import { scoringConfigRepository, type ScoringConfigRepository } from "@/lib/db/repositories/scoringConfigRepository";

const WEIGHT_SUM_TOLERANCE = 0.01;

export class InvalidWeightsError extends Error {
  constructor(sum: number) {
    super(`Scoring weights must sum to 1.0 (± ${WEIGHT_SUM_TOLERANCE}); got ${sum.toFixed(4)}`);
    this.name = "InvalidWeightsError";
  }
}

export class DuplicateVersionError extends Error {
  constructor(version: string) {
    super(`A scoring config with version "${version}" already exists`);
    this.name = "DuplicateVersionError";
  }
}

export class ScoringConfigNotFoundError extends Error {
  constructor() {
    super("Scoring config not found");
    this.name = "ScoringConfigNotFoundError";
  }
}

type Deps = {
  scoringConfigs: Pick<ScoringConfigRepository, "listVersions" | "getByVersion" | "create" | "activate">;
};

const defaultDeps: Deps = { scoringConfigs: scoringConfigRepository };

/** buildPlan.md §113.3: weights are relative contributions and must sum to 1.0. Pure, no I/O. */
export function validateWeights(weights: ScoringConfig["weights"]): void {
  const sum = Object.values(weights).reduce((total, value) => total + value, 0);
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    throw new InvalidWeightsError(sum);
  }
}

export async function listScoringConfigVersions(deps: Deps = defaultDeps): Promise<ScoringConfig[]> {
  return deps.scoringConfigs.listVersions();
}

/**
 * buildPlan.md §46: a scoring config is immutable once created — a "new
 * version" is always a new document, never an edit of an existing one.
 */
export async function createScoringConfigVersion(
  input: Omit<ScoringConfig, "_id" | "isActive" | "createdAt">,
  deps: Deps = defaultDeps,
): Promise<ScoringConfig> {
  validateWeights(input.weights);

  const existing = await deps.scoringConfigs.getByVersion(input.version);
  if (existing) throw new DuplicateVersionError(input.version);

  return deps.scoringConfigs.create(input);
}

export async function activateScoringConfigVersion(id: string, deps: Deps = defaultDeps): Promise<void> {
  const versions = await deps.scoringConfigs.listVersions();
  if (!versions.some((version) => version._id === id)) {
    throw new ScoringConfigNotFoundError();
  }
  await deps.scoringConfigs.activate(id);
}
