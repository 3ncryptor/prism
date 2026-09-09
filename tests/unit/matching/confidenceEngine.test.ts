import { computeConfidence } from "@/lib/matching/confidenceEngine";
import { makeRetrievalMap, makeStudentProfile } from "./fixtures";

describe("computeConfidence", () => {
  it("returns a high confidence for a complete profile with strong, unambiguous matches", () => {
    const confidence = computeConfidence({
      studentProfile: makeStudentProfile(),
      evidence: [
        { category: "SKILL", requirement: "React", score: 1, reason: "Canonical skill match", matchedEvidence: "React" },
      ],
      retrieval: new Map(),
    });
    expect(confidence).toBeGreaterThan(80);
  });

  it("returns a low extraction-quality contribution for an empty profile", () => {
    const emptyProfile = makeStudentProfile({ skills: [], projects: [], experience: [], education: [] });
    const withContent = computeConfidence({
      studentProfile: makeStudentProfile(),
      evidence: [],
      retrieval: new Map(),
    });
    const withoutContent = computeConfidence({
      studentProfile: emptyProfile,
      evidence: [],
      retrieval: new Map(),
    });
    expect(withoutContent).toBeLessThan(withContent);
  });

  it("rewards a wide margin between top-1 and top-2 retrieval scores", () => {
    const clear = computeConfidence({
      studentProfile: makeStudentProfile(),
      evidence: [],
      retrieval: makeRetrievalMap([
        ["SKILL", "react", { text: "x", score: 0.95, featureType: "PROJECT", secondBestScore: 0.2 }],
      ]),
    });
    const ambiguous = computeConfidence({
      studentProfile: makeStudentProfile(),
      evidence: [],
      retrieval: makeRetrievalMap([
        ["SKILL", "react", { text: "x", score: 0.95, featureType: "PROJECT", secondBestScore: 0.93 }],
      ]),
    });
    expect(clear).toBeGreaterThan(ambiguous);
  });

  it("penalizes evidence entries with no matched evidence text", () => {
    const withEvidence = computeConfidence({
      studentProfile: makeStudentProfile(),
      evidence: [{ category: "SKILL", requirement: "React", score: 1, reason: "match", matchedEvidence: "React" }],
      retrieval: new Map(),
    });
    const withoutEvidence = computeConfidence({
      studentProfile: makeStudentProfile(),
      evidence: [{ category: "SKILL", requirement: "AWS", score: 0, reason: "no match" }],
      retrieval: new Map(),
    });
    expect(withoutEvidence).toBeLessThan(withEvidence);
  });
});
