/**
 * buildPlan.md §32 / BACKEND_ARCHITECTURE.md §0.2, recalibrated 2026-09:
 * scaled by *how much* of the mandatory bar was missed, not a flat cut
 * for missing any single mandatory skill. `mandatoryPenalty` is now the
 * worst-case cut (applied only when every mandatory requirement is
 * missing) — missing 1 of 5 mandatory skills with mandatoryPenalty=0.75
 * costs 15%, not 25%. Confirmed live: a candidate who had 4 of 5
 * mandatory skills, all preferred skills, real relevant projects, and
 * was merely short on tenured experience got the *same* flat 25% cut a
 * candidate missing every mandatory skill would get — indistinguishable
 * treatment for very different candidates.
 */
export function applyMandatoryPenalty(
  score: number,
  mandatoryMissedCount: number,
  mandatoryTotal: number,
  mandatoryPenalty: number,
): number {
  if (mandatoryTotal === 0 || mandatoryMissedCount === 0) return score;
  const missedFraction = mandatoryMissedCount / mandatoryTotal;
  return score * (1 - mandatoryPenalty * missedFraction);
}
