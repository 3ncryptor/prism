import { bucketScore } from "@/lib/matching/bucketEngine";
import { makeScoringConfig } from "./fixtures";

describe("bucketScore", () => {
  const config = makeScoringConfig({ buckets: { bestFit: 80, moderateFit: 60 } });

  it("buckets a score at or above bestFit as BEST_FIT", () => {
    expect(bucketScore(80, config)).toBe("BEST_FIT");
    expect(bucketScore(95, config)).toBe("BEST_FIT");
  });

  it("buckets a score between moderateFit and bestFit as MODERATE_FIT", () => {
    expect(bucketScore(60, config)).toBe("MODERATE_FIT");
    expect(bucketScore(79.9, config)).toBe("MODERATE_FIT");
  });

  it("buckets a score below moderateFit as LOW_FIT", () => {
    expect(bucketScore(59.9, config)).toBe("LOW_FIT");
    expect(bucketScore(0, config)).toBe("LOW_FIT");
  });
});
