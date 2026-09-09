import { matchOtherRequirements } from "@/lib/matching/requirementMatcher";
import { makeJobProfile, makeRetrievalMap, makeScoringConfig, makeStudentProfile } from "./fixtures";

describe("matchOtherRequirements", () => {
  it("returns 100 when there are no semantic requirements", () => {
    const result = matchOtherRequirements(makeStudentProfile(), makeJobProfile(), new Map(), makeScoringConfig());
    expect(result.categoryScore).toBe(100);
  });

  it("scores a direct certification match as 1.0", () => {
    const student = makeStudentProfile({
      certifications: [{ name: "AWS Certified Developer", evidence: ["AWS Certified Developer"] }],
    });
    const job = makeJobProfile({
      semanticRequirements: [{ description: "AWS Certified Developer", importance: "HIGH" }],
    });
    const result = matchOtherRequirements(student, job, new Map(), makeScoringConfig());
    expect(result.evidence[0].score).toBe(1.0);
    expect(result.evidence[0].reason).toContain("Direct");
  });

  it("falls back to semantic retrieval when there is no direct match", () => {
    const job = makeJobProfile({
      semanticRequirements: [{ description: "Experience mentoring junior developers", importance: "MEDIUM" }],
    });
    const retrieval = makeRetrievalMap([
      ["SEMANTIC_REQUIREMENT", "0", { text: "Led a team of 3 volunteers", score: 0.88, featureType: "EXPERIENCE", secondBestScore: 0.3 }],
    ]);
    const result = matchOtherRequirements(makeStudentProfile(), job, retrieval, makeScoringConfig());
    expect(result.evidence[0].score).toBe(0.88);
  });

  it("scores 0 with no direct or semantic evidence", () => {
    const job = makeJobProfile({
      semanticRequirements: [{ description: "Fluent in Mandarin", importance: "LOW" }],
    });
    const result = matchOtherRequirements(makeStudentProfile(), job, new Map(), makeScoringConfig());
    expect(result.categoryScore).toBe(0);
  });
});
