/**
 * BACKEND_ARCHITECTURE.md §0.5: degree/field equivalence needs its own
 * small taxonomy, not string equality — "B.Tech"/"B.E." and "CSE"/
 * "Computer Science" are the same thing for matching purposes but aren't
 * equal strings. Static table, seeded like the skill taxonomy in spirit
 * but small/stable enough not to need its own DB collection for V1.
 */

const DEGREE_GROUPS: string[][] = [
  ["b.tech", "b.e.", "be", "btech", "bachelor of technology", "bachelor of engineering"],
  ["m.tech", "m.e.", "me", "mtech", "master of technology", "master of engineering"],
  ["b.sc", "bsc", "bachelor of science"],
  ["m.sc", "msc", "master of science"],
  ["bca", "bachelor of computer applications"],
  ["mca", "master of computer applications"],
  ["mba", "master of business administration"],
];

const FIELD_GROUPS: string[][] = [
  ["computer science", "cse", "cs", "computer science and engineering", "computer science & engineering"],
  ["information technology", "it"],
  ["computer science and ai", "cs & ai", "cs and ai", "ai", "artificial intelligence"],
  ["electronics", "ece", "electronics and communication", "electronics and communication engineering"],
  ["electrical", "eee", "electrical and electronics"],
  ["mechanical", "mech", "mechanical engineering"],
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function findGroup(groups: string[][], value: string): string[] | undefined {
  const normalized = normalize(value);
  return groups.find((group) => group.includes(normalized));
}

/** Returns true if `a` and `b` refer to the same degree, per the static equivalence table. */
export function isDegreeEquivalent(a: string, b: string): boolean {
  if (normalize(a) === normalize(b)) return true;
  const group = findGroup(DEGREE_GROUPS, a);
  return group ? group.includes(normalize(b)) : false;
}

/** Returns true if `a` and `b` refer to the same field of study. */
export function isFieldEquivalent(a: string, b: string): boolean {
  if (normalize(a) === normalize(b)) return true;
  const group = findGroup(FIELD_GROUPS, a);
  return group ? group.includes(normalize(b)) : false;
}
