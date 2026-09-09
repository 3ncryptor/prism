/**
 * buildPlan.md §32 / BACKEND_ARCHITECTURE.md §0.2: applies once, not per
 * missing mandatory skill — compounding would double-count, since the
 * Skills category score already reflects each individual miss.
 */
export function applyMandatoryPenalty(score: number, mandatoryMissed: boolean, mandatoryPenalty: number): number {
  return mandatoryMissed ? score * mandatoryPenalty : score;
}
