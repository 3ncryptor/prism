import { matchExperience, computeRelevantExperienceMonths } from "@/lib/matching/experienceMatcher";
import { makeExperience } from "./fixtures";

describe("matchExperience", () => {
  it("returns 100 when there is no experience requirement", () => {
    const result = matchExperience(undefined, [makeExperience()]);
    expect(result.categoryScore).toBe(100);
  });

  it("scores the ratio of relevant months to required months", () => {
    const result = matchExperience({ minMonths: 12, disqualifying: false }, [makeExperience({ months: 6 })]);
    expect(result.categoryScore).toBeCloseTo((6 / 12) * 100);
    expect(result.relevantMonths).toBe(6);
  });

  it("caps the ratio at 1.0 when the student exceeds the requirement", () => {
    const result = matchExperience({ minMonths: 3, disqualifying: false }, [makeExperience({ months: 12 })]);
    expect(result.categoryScore).toBe(100);
  });

  it("only counts months from domain-relevant experience when a domain is set", () => {
    const experience = [
      makeExperience({ role: "Backend Intern", description: "Built backend APIs", months: 6 }),
      makeExperience({ role: "Marketing Intern", description: "Ran social campaigns", technologies: [], months: 4 }),
    ];
    const months = computeRelevantExperienceMonths(experience, "backend");
    expect(months).toBe(6);
  });

  it("counts all experience when no domain is specified", () => {
    const experience = [makeExperience({ months: 6 }), makeExperience({ months: 4 })];
    expect(computeRelevantExperienceMonths(experience)).toBe(10);
  });
});
