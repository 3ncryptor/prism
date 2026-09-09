import { applyMandatoryPenalty } from "@/lib/matching/penaltyEngine";

describe("applyMandatoryPenalty", () => {
  it("leaves the score untouched when no mandatory requirement was missed", () => {
    expect(applyMandatoryPenalty(90, false, 0.75)).toBe(90);
  });

  it("applies the penalty multiplier once when a mandatory requirement was missed", () => {
    expect(applyMandatoryPenalty(90, true, 0.75)).toBeCloseTo(67.5);
  });
});
