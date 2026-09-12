import { evaluateMatch } from "@/lib/matching/matchingEngine";
import {
  makeEducation,
  makeJobProfile,
  makeRequirement,
  makeScoringConfig,
  makeSkill,
  makeStudentProfile,
} from "./fixtures";

describe("evaluateMatch", () => {
  it("produces a high score and BEST_FIT bucket for a clean, fully-matching profile", () => {
    const student = makeStudentProfile({
      skills: [makeSkill({ canonicalName: "react" })],
      education: [makeEducation({ degree: "B.Tech", field: "Computer Science" })],
    });
    const job = makeJobProfile({
      requiredSkills: [makeRequirement({ canonicalName: "react", importance: "MANDATORY" })],
      educationRequirements: [{ degree: ["b.tech"], field: ["computer science"], disqualifying: false }],
    });

    const result = evaluateMatch(student, job, makeScoringConfig(), new Map());

    expect(result.eligible).toBe(true);
    expect(result.score).toBeGreaterThan(90);
    expect(result.bucket).toBe("BEST_FIT");
  });

  it("applies the mandatory penalty once when a MANDATORY skill is entirely missing", () => {
    const student = makeStudentProfile({ skills: [] });
    const job = makeJobProfile({
      requiredSkills: [makeRequirement({ canonicalName: "python", name: "Python", importance: "MANDATORY" })],
    });

    const result = evaluateMatch(student, job, makeScoringConfig(), new Map());

    expect(result.missingRequirements).toContain("Python");
    // With the mandatory skill fully missing, the skills category score is 0
    // and the penalty is applied on top — the final score must be materially
    // reduced relative to a config with no penalty at all. mandatoryPenalty
    // is the worst-case cut (0 = no cut), not a retention fraction.
    const withoutPenalty = evaluateMatch(student, job, makeScoringConfig({ mandatoryPenalty: 0 }), new Map());
    expect(result.score).toBeLessThan(withoutPenalty.score);
  });

  it("marks a student ineligible but still produces a full score/bucket (BACKEND_ARCHITECTURE.md §0.3)", () => {
    const student = makeStudentProfile({ education: [makeEducation({ cgpa: 5 })] });
    const job = makeJobProfile({
      constraints: [{ name: "Min CGPA 9", type: "CGPA", value: 9, disqualifying: true }],
    });

    const result = evaluateMatch(student, job, makeScoringConfig(), new Map());

    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReasons.length).toBeGreaterThan(0);
    expect(typeof result.score).toBe("number");
    expect(["BEST_FIT", "MODERATE_FIT", "LOW_FIT"]).toContain(result.bucket);
  });

  it("keeps the final score within [0, 100]", () => {
    const student = makeStudentProfile({ skills: [] });
    const job = makeJobProfile({
      requiredSkills: [
        makeRequirement({ canonicalName: "a", name: "A", importance: "MANDATORY" }),
        makeRequirement({ canonicalName: "b", name: "B", importance: "MANDATORY" }),
      ],
    });
    const result = evaluateMatch(student, job, makeScoringConfig({ mandatoryPenalty: 0 }), new Map());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
