import { scoreHardRequirements, aggregateScore } from "@/lib/matching/scoreAggregator";
import { makeEducation, makeJobProfile, makeScoringConfig, makeStudentProfile } from "./fixtures";

describe("scoreHardRequirements", () => {
  it("defaults to 100 when there are no soft constraints", () => {
    const result = scoreHardRequirements(makeStudentProfile(), makeJobProfile({ constraints: [] }));
    expect(result.categoryScore).toBe(100);
  });

  it("ignores disqualifying constraints (eligibility's job, not this category's)", () => {
    const job = makeJobProfile({
      constraints: [{ name: "Min CGPA 9", type: "CGPA", value: 9, disqualifying: true }],
    });
    const result = scoreHardRequirements(makeStudentProfile({ education: [makeEducation({ cgpa: 5 })] }), job);
    expect(result.categoryScore).toBe(100);
  });

  it("scores a satisfied soft constraint as passed", () => {
    const job = makeJobProfile({
      constraints: [{ name: "Preferred grad year 2025", type: "GRADUATION_YEAR", value: 2025, disqualifying: false }],
    });
    const result = scoreHardRequirements(makeStudentProfile({ education: [makeEducation({ endYear: 2025 })] }), job);
    expect(result.categoryScore).toBe(100);
  });

  it("scores an unsatisfied soft constraint as failed but not disqualifying", () => {
    const job = makeJobProfile({
      constraints: [{ name: "Preferred grad year 2025", type: "GRADUATION_YEAR", value: 2025, disqualifying: false }],
    });
    const result = scoreHardRequirements(makeStudentProfile({ education: [makeEducation({ endYear: 2026 })] }), job);
    expect(result.categoryScore).toBe(0);
  });
});

describe("aggregateScore", () => {
  it("computes the weighted sum across all six categories", () => {
    const config = makeScoringConfig();
    const score = aggregateScore(
      { hardRequirements: 100, skills: 100, experience: 100, projects: 100, education: 100, other: 100 },
      config,
    );
    expect(score).toBeCloseTo(100);
  });

  it("weights each category proportionally", () => {
    const config = makeScoringConfig();
    const score = aggregateScore(
      { hardRequirements: 0, skills: 100, experience: 0, projects: 0, education: 0, other: 0 },
      config,
    );
    expect(score).toBeCloseTo(30); // skills weight is 0.3
  });
});
