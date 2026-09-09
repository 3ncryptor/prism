import { evaluateEligibility } from "@/lib/matching/eligibilityEngine";
import { makeEducation, makeJobProfile, makeStudentProfile } from "./fixtures";

describe("evaluateEligibility", () => {
  it("is eligible when there are no disqualifying constraints", () => {
    const result = evaluateEligibility(makeStudentProfile(), makeJobProfile());
    expect(result.eligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("fails a disqualifying CGPA constraint the student doesn't meet", () => {
    const job = makeJobProfile({
      constraints: [{ name: "Min CGPA 9", type: "CGPA", value: 9, disqualifying: true }],
    });
    const student = makeStudentProfile({ education: [makeEducation({ cgpa: 8.0 })] });
    const result = evaluateEligibility(student, job);
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toContain("Min CGPA 9");
  });

  it("does not gate on a non-disqualifying constraint", () => {
    const job = makeJobProfile({
      constraints: [{ name: "Preferred CGPA 9", type: "CGPA", value: 9, disqualifying: false }],
    });
    const student = makeStudentProfile({ education: [makeEducation({ cgpa: 8.0 })] });
    expect(evaluateEligibility(student, job).eligible).toBe(true);
  });

  it("fails a disqualifying education requirement with no matching degree", () => {
    const job = makeJobProfile({
      educationRequirements: [{ degree: ["mba"], disqualifying: true }],
    });
    const student = makeStudentProfile({ education: [makeEducation({ degree: "B.Tech" })] });
    const result = evaluateEligibility(student, job);
    expect(result.eligible).toBe(false);
  });

  it("fails a disqualifying minimum-experience requirement", () => {
    const job = makeJobProfile({
      requiredExperience: { minMonths: 24, disqualifying: true },
    });
    const student = makeStudentProfile({ experience: [{ ...makeStudentProfile().experience[0], months: 6 }] });
    const result = evaluateEligibility(student, job);
    expect(result.eligible).toBe(false);
  });

  it("collects every failure reason rather than short-circuiting", () => {
    const job = makeJobProfile({
      constraints: [{ name: "Min CGPA 9", type: "CGPA", value: 9, disqualifying: true }],
      educationRequirements: [{ degree: ["mba"], disqualifying: true }],
    });
    const student = makeStudentProfile({ education: [makeEducation({ degree: "B.Tech", cgpa: 8.0 })] });
    const result = evaluateEligibility(student, job);
    expect(result.reasons).toHaveLength(2);
  });
});
