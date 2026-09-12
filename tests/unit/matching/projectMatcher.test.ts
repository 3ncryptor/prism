import { matchProjects } from "@/lib/matching/projectMatcher";
import { makeJobProfile, makeRetrievalMap, makeScoringConfig } from "./fixtures";

describe("matchProjects", () => {
  it("returns 100 when the JD has no responsibilities", () => {
    expect(matchProjects(makeJobProfile({ responsibilities: [] }), new Map(), makeScoringConfig()).categoryScore).toBe(100);
  });

  it("scores a strong semantic match highly", () => {
    const job = makeJobProfile({ responsibilities: ["Build scalable backend APIs"] });
    const retrieval = makeRetrievalMap([
      ["RESPONSIBILITY", "0", { text: "Built REST APIs using Node.js", score: 0.9, featureType: "PROJECT", secondBestScore: 0.4 }],
    ]);
    const result = matchProjects(job, retrieval, makeScoringConfig());
    expect(result.evidence[0].score).toBe(0.9);
    expect(result.evidence[0].reason).toBe("Strong semantic match");
  });

  it("scores 0 when there is no retrieved evidence for a responsibility", () => {
    const job = makeJobProfile({ responsibilities: ["Deploy to Kubernetes"] });
    const result = matchProjects(job, new Map(), makeScoringConfig());
    expect(result.evidence[0].score).toBe(0);
    expect(result.categoryScore).toBe(0);
  });
});
