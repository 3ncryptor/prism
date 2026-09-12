/**
 * BACKEND_ARCHITECTURE.md §0.5: degree/field equivalence needs its own
 * small taxonomy, not string equality — "B.Tech"/"B.E." and "CSE"/
 * "Computer Science" are the same thing for matching purposes but aren't
 * equal strings. Static table, seeded like the skill taxonomy in spirit
 * but small/stable enough not to need its own DB collection for V1.
 */

interface DegreeGroup {
  /** 1 = bachelor's-level, 2 = master's-level, 3 = doctorate. */
  tier: number;
  terms: string[];
}

const DEGREE_GROUPS: DegreeGroup[] = [
  { tier: 1, terms: ["b.tech", "b.e.", "be", "btech", "bachelor of technology", "bachelor of engineering"] },
  { tier: 1, terms: ["b.sc", "bsc", "bachelor of science"] },
  { tier: 1, terms: ["bca", "bachelor of computer applications"] },
  { tier: 1, terms: ["b.a.", "ba", "bachelor of arts"] },
  { tier: 1, terms: ["b.com", "bcom", "bachelor of commerce"] },
  { tier: 2, terms: ["m.tech", "m.e.", "me", "mtech", "master of technology", "master of engineering"] },
  { tier: 2, terms: ["m.sc", "msc", "master of science"] },
  { tier: 2, terms: ["mca", "master of computer applications"] },
  { tier: 2, terms: ["mba", "master of business administration"] },
  { tier: 2, terms: ["m.a.", "ma", "master of arts"] },
  { tier: 2, terms: ["m.com", "mcom", "master of commerce"] },
  { tier: 3, terms: ["phd", "ph.d.", "doctorate", "doctor of philosophy"] },
];

/**
 * Real JD text (and Gemini's own extraction of it) overwhelmingly says
 * "Bachelor's degree" rather than naming a specific degree — and a
 * generic level requirement is satisfied by ANY degree at that tier or
 * higher (a Master's necessarily implies a completed Bachelor's). Without
 * this, a requirement extracted as the generic term never matched any
 * specific named degree at all (bachelor's/master's weren't in
 * DEGREE_GROUPS), so eligibility checks failed for every candidate
 * against almost every real-world JD — confirmed live: a B.Tech graduate
 * and a Master's-in-Data-Science graduate were both marked ineligible for
 * jobs requiring only "Bachelor's degree".
 */
const GENERIC_LEVEL_TERMS: Record<string, number> = {
  "bachelor's": 1,
  bachelors: 1,
  bachelor: 1,
  "bachelor's degree": 1,
  "undergraduate degree": 1,
  undergraduate: 1,
  "master's": 2,
  masters: 2,
  master: 2,
  "master's degree": 2,
  "graduate degree": 2,
  "postgraduate degree": 2,
  postgraduate: 2,
  phd: 3,
  "ph.d.": 3,
  doctorate: 3,
  "doctor of philosophy": 3,
};

const FIELD_GROUPS: string[][] = [
  ["computer science", "cse", "cs", "computer science and engineering", "computer science & engineering"],
  ["information technology", "it"],
  ["computer science and ai", "cs & ai", "cs and ai", "ai", "artificial intelligence"],
  ["electronics", "ece", "electronics and communication", "electronics and communication engineering"],
  ["electrical", "eee", "electrical and electronics"],
  ["mechanical", "mech", "mechanical engineering"],
];

function normalize(value: string): string {
  // Gemini extraction sometimes produces typographic ("smart") quotes —
  // confirmed live: a JD requirement's raw JobConstraint.value came back
  // as "Bachelor’s degree in Computer Science or related field" (curly
  // apostrophe), which never equals the straight-apostrophe "bachelor's"
  // key below. Folding both to one form up front makes every comparison
  // in this file immune to which quote style the source text/LLM used.
  return value.replace(/[‘’]/g, "'").trim().toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word/phrase containment — "bachelor's" must not match inside "bachelor's-adjacent-field" or similar. */
function containsTerm(text: string, term: string): boolean {
  return new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(text);
}

function findDegreeGroup(value: string): DegreeGroup | undefined {
  const normalized = normalize(value);
  return DEGREE_GROUPS.find((group) => group.terms.includes(normalized));
}

/**
 * Some extracted requirements are a full descriptive sentence rather than
 * a bare degree term — confirmed live: a JobConstraint of type "DEGREE"
 * carried the entire JD clause ("Bachelor's degree in Computer Science or
 * related field") in `value`, not just "Bachelor's". Exact-match lookup
 * (the fast path, used for the common bare-term case from
 * educationRequirements) never finds a generic level term inside a full
 * sentence, so this falls back to a whole-word search within it. Scoped
 * to GENERIC_LEVEL_TERMS only (distinctive words like "bachelor"/
 * "master") — deliberately not extended to DEGREE_GROUPS's short specific
 * abbreviations ("be", "me", "ma", ...), which would false-positive
 * against ordinary English words inside a free-text sentence.
 */
function findGenericTier(value: string): number | undefined {
  const normalized = normalize(value);
  if (GENERIC_LEVEL_TERMS[normalized] !== undefined) return GENERIC_LEVEL_TERMS[normalized];
  for (const [term, tier] of Object.entries(GENERIC_LEVEL_TERMS)) {
    if (containsTerm(normalized, term)) return tier;
  }
  return undefined;
}

function findFieldGroup(groups: string[][], value: string): string[] | undefined {
  const normalized = normalize(value);
  return groups.find((group) => group.includes(normalized));
}

/**
 * Returns true if `candidateDegree` satisfies `requiredDegree`. Two ways
 * to satisfy a requirement:
 *  - Same specific degree, or a known synonym of it (e.g. "B.Tech" for a
 *    "B.E." requirement) — the original exact-equivalence behavior.
 *  - `requiredDegree` is a generic level term ("Bachelor's", "Master's",
 *    ...): satisfied by any specific degree at that tier or higher.
 * A requirement naming one *specific* degree (e.g. "B.Tech") is never
 * satisfied by a different specific degree at a higher tier (an M.Tech
 * does not satisfy a "B.Tech required" JD) — only a generic requirement
 * benefits from the tier comparison, so "a specific ask stays specific."
 */
export function isDegreeEquivalent(candidateDegree: string, requiredDegree: string): boolean {
  const normalizedCandidate = normalize(candidateDegree);
  const normalizedRequired = normalize(requiredDegree);
  if (normalizedCandidate === normalizedRequired) return true;

  const candidateGroup = findDegreeGroup(candidateDegree);
  if (candidateGroup?.terms.includes(normalizedRequired)) return true;

  const requiredTier = findGenericTier(requiredDegree);
  if (requiredTier !== undefined) {
    const candidateTier = candidateGroup?.tier ?? findGenericTier(candidateDegree);
    if (candidateTier !== undefined) return candidateTier >= requiredTier;
  }

  return false;
}

/** Returns true if `a` and `b` refer to the same field of study. */
export function isFieldEquivalent(a: string, b: string): boolean {
  if (normalize(a) === normalize(b)) return true;
  const group = findFieldGroup(FIELD_GROUPS, a);
  return group ? group.includes(normalize(b)) : false;
}
