import { isDegreeEquivalent, isFieldEquivalent } from "@/lib/config/degreeEquivalence";

describe("isDegreeEquivalent", () => {
  it("matches identical degree strings", () => {
    expect(isDegreeEquivalent("B.Tech", "B.Tech")).toBe(true);
  });

  it("matches known synonyms within the same specific degree group", () => {
    expect(isDegreeEquivalent("Bachelor of Technology", "B.Tech")).toBe(true);
    expect(isDegreeEquivalent("B.E.", "B.Tech")).toBe(true);
  });

  it("does not match unrelated specific degrees", () => {
    expect(isDegreeEquivalent("MBA", "B.Tech")).toBe(false);
    expect(isDegreeEquivalent("B.Sc", "B.Tech")).toBe(false);
  });

  // Regression coverage for the bug found during a live comprehensive
  // test (2026-09): a JD requiring the generic "Bachelor's" (exactly how
  // real JD text, and Gemini's own extraction of it, phrases this) never
  // matched any specific named degree, so every real candidate was
  // incorrectly marked ineligible.
  it("matches a generic 'Bachelor's' requirement against any specific bachelor's-level degree", () => {
    expect(isDegreeEquivalent("Bachelor of Technology", "Bachelor's")).toBe(true);
    expect(isDegreeEquivalent("B.Sc", "Bachelor's")).toBe(true);
    expect(isDegreeEquivalent("BCA", "bachelors")).toBe(true);
  });

  it("matches a generic 'Master's' requirement against any specific master's-level degree", () => {
    expect(isDegreeEquivalent("Master of Science", "Master's")).toBe(true);
    expect(isDegreeEquivalent("MBA", "masters")).toBe(true);
  });

  // The other half of the same regression: a Master's degree necessarily
  // implies a completed Bachelor's, so it must satisfy a Bachelor's-level
  // requirement — this was the exact case that failed live (a Master's-
  // in-Data-Science candidate marked ineligible for a "Bachelor's
  // degree" requirement).
  it("matches a higher-tier degree against a lower generic level requirement", () => {
    expect(isDegreeEquivalent("Master of Science", "Bachelor's")).toBe(true);
    expect(isDegreeEquivalent("PhD", "Bachelor's")).toBe(true);
    expect(isDegreeEquivalent("PhD", "Master's")).toBe(true);
  });

  it("does not match a lower-tier degree against a higher generic level requirement", () => {
    expect(isDegreeEquivalent("B.Tech", "Master's")).toBe(false);
    expect(isDegreeEquivalent("Bachelor's", "Master's")).toBe(false);
  });

  it("does not let a higher-tier specific degree satisfy a different specific degree requirement", () => {
    // A JD asking for a specific "B.Tech" (not the generic "Bachelor's")
    // is not satisfied by an M.Tech — a specific ask stays specific, even
    // though M.Tech is a higher tier than B.Tech.
    expect(isDegreeEquivalent("M.Tech", "B.Tech")).toBe(false);
  });

  it("matches when both sides use the generic term", () => {
    expect(isDegreeEquivalent("Bachelor's", "Bachelor's")).toBe(true);
    expect(isDegreeEquivalent("Master's", "Bachelor's")).toBe(true);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(isDegreeEquivalent("  bachelor of technology  ", "B.TECH")).toBe(true);
    expect(isDegreeEquivalent("MASTER OF SCIENCE", " bachelor's ")).toBe(true);
  });

  it("returns false for unrecognized degree strings", () => {
    expect(isDegreeEquivalent("Diploma in Information Technology", "Bachelor's")).toBe(false);
  });

  // A JobConstraint of type "DEGREE" can carry a full descriptive sentence
  // in `value` rather than a bare degree term (confirmed live: Gemini
  // extracted "Bachelor's degree in Computer Science or related field" as
  // one JD constraint's value) — the generic-level lookup must still find
  // the term inside that sentence, not just at an exact bare match.
  it("matches a generic level term embedded inside a full requirement sentence", () => {
    expect(isDegreeEquivalent("Bachelor of Technology", "Bachelor's degree in Computer Science or related field")).toBe(
      true,
    );
    expect(isDegreeEquivalent("Diploma", "Bachelor's degree in Computer Science or related field")).toBe(false);
  });

  // Regression for the exact live failure: Gemini's extraction used a
  // typographic ("smart") apostrophe (U+2019 ’), not a straight one — the
  // constraint value was literally "Bachelor’s degree...".
  it("treats typographic (curly) apostrophes the same as straight ones", () => {
    expect(isDegreeEquivalent("Bachelor of Technology", "Bachelor’s degree in Computer Science or related field")).toBe(
      true,
    );
    expect(isDegreeEquivalent("Bachelor’s", "Bachelor's")).toBe(true);
  });
});

describe("isFieldEquivalent", () => {
  it("matches identical field strings", () => {
    expect(isFieldEquivalent("Computer Science", "Computer Science")).toBe(true);
  });

  it("matches known synonyms within the same field group", () => {
    expect(isFieldEquivalent("CSE", "Computer Science")).toBe(true);
    expect(isFieldEquivalent("Computer Science and Engineering", "cs")).toBe(true);
  });

  it("does not match unrelated fields", () => {
    expect(isFieldEquivalent("Mechanical Engineering", "Computer Science")).toBe(false);
  });
});
