/** buildPlan.md §114 */
export type VerificationMethod = "EXACT" | "FUZZY" | "UNVERIFIED";

export interface VerificationResult {
  verified: boolean;
  method: VerificationMethod;
}

const FUZZY_THRESHOLD = 0.6;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): Set<string> {
  return new Set(normalize(text).split(" ").filter(Boolean));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * §114: exact substring containment first, then a token-overlap fallback
 * over a sliding window of the source text, else UNVERIFIED.
 */
export function verifyEvidence(claim: string, sourceText: string): VerificationResult {
  const normalizedClaim = normalize(claim);
  const normalizedSource = normalize(sourceText);

  if (normalizedClaim.length === 0) {
    return { verified: false, method: "UNVERIFIED" };
  }

  if (normalizedSource.includes(normalizedClaim)) {
    return { verified: true, method: "EXACT" };
  }

  const claimTokens = tokenize(claim);
  const sourceWords = normalizedSource.split(" ").filter(Boolean);
  const windowSize = Math.max(claimTokens.size, 3);

  let bestScore = 0;
  for (let i = 0; i <= sourceWords.length - windowSize; i++) {
    const window = sourceWords.slice(i, i + windowSize).join(" ");
    const score = jaccardSimilarity(claimTokens, tokenize(window));
    if (score > bestScore) bestScore = score;
  }

  if (bestScore >= FUZZY_THRESHOLD) {
    return { verified: true, method: "FUZZY" };
  }

  return { verified: false, method: "UNVERIFIED" };
}
