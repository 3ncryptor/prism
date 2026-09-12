import { applyMandatoryPenalty } from "@/lib/matching/penaltyEngine";

describe("applyMandatoryPenalty", () => {
  it("leaves the score untouched when no mandatory requirement was missed", () => {
    expect(applyMandatoryPenalty(90, 0, 5, 0.75)).toBe(90);
  });

  it("leaves the score untouched when there are no mandatory requirements at all", () => {
    expect(applyMandatoryPenalty(90, 0, 0, 0.75)).toBe(90);
  });

  it("applies the full penalty when every mandatory requirement was missed", () => {
    expect(applyMandatoryPenalty(90, 5, 5, 0.75)).toBeCloseTo(22.5);
  });

  // Regression for a live scoring bug: a candidate with 4 of 5 mandatory
  // skills, all preferred skills, and real relevant projects — short
  // only on one mandatory skill and on tenured experience — got the same
  // flat 25% cut as a candidate missing every mandatory skill would.
  // Missing 1 of 5 must cost proportionally less than missing 5 of 5.
  it("scales the penalty by the fraction of mandatory requirements missed", () => {
    // 1 of 5 missed: 1 - 0.75 * (1/5) = 0.85
    expect(applyMandatoryPenalty(90, 1, 5, 0.75)).toBeCloseTo(76.5);
    // 2 of 5 missed: 1 - 0.75 * (2/5) = 0.7
    expect(applyMandatoryPenalty(90, 2, 5, 0.75)).toBeCloseTo(63);
  });

  it("a partial miss always costs strictly less than missing everything", () => {
    const partial = applyMandatoryPenalty(90, 1, 5, 0.75);
    const total = applyMandatoryPenalty(90, 5, 5, 0.75);
    expect(partial).toBeGreaterThan(total);
  });
});
