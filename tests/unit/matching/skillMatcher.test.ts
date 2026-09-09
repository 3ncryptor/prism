import { matchSkills } from "@/lib/matching/skillMatcher";
import { makeRequirement, makeRetrievalMap, makeScoringConfig, makeSkill } from "./fixtures";

describe("matchSkills", () => {
  it("returns 100 when there are no requirements", () => {
    const result = matchSkills([], [makeSkill()], new Map(), makeScoringConfig());
    expect(result.categoryScore).toBe(100);
  });

  it("scores an exact canonical match as 1.0", () => {
    const result = matchSkills(
      [makeRequirement({ canonicalName: "react" })],
      [makeSkill({ canonicalName: "react" })],
      new Map(),
      makeScoringConfig(),
    );
    expect(result.categoryScore).toBe(100);
    expect(result.evidence[0].reason).toBe("Canonical skill match");
  });

  it("uses semantic retrieval when there is no exact match", () => {
    const config = makeScoringConfig();
    const retrieval = makeRetrievalMap([
      ["SKILL", "aws", { text: "Deployed to AWS EC2", score: 0.9, featureType: "PROJECT", secondBestScore: 0.4 }],
    ]);
    const result = matchSkills(
      [makeRequirement({ name: "AWS", canonicalName: "aws" })],
      [makeSkill({ canonicalName: "react" })],
      retrieval,
      config,
    );
    expect(result.evidence[0].score).toBe(0.9);
    expect(result.evidence[0].reason).toBe("Strong semantic match");
  });

  it("scores below the possible threshold as a full miss", () => {
    const config = makeScoringConfig();
    const retrieval = makeRetrievalMap([
      ["SKILL", "aws", { text: "irrelevant", score: 0.5, featureType: "PROJECT", secondBestScore: 0.2 }],
    ]);
    const result = matchSkills(
      [makeRequirement({ name: "AWS", canonicalName: "aws" })],
      [],
      retrieval,
      config,
    );
    expect(result.evidence[0].score).toBe(0);
    expect(result.missingRequirements).toContain("AWS");
  });

  it("does not flag a LOW-importance miss as missing", () => {
    const result = matchSkills(
      [makeRequirement({ name: "Docker", canonicalName: "docker", importance: "LOW" })],
      [],
      new Map(),
      makeScoringConfig(),
    );
    expect(result.missingRequirements).not.toContain("Docker");
  });

  it("flags a true (score-0) MANDATORY miss for the penalty engine", () => {
    const result = matchSkills(
      [makeRequirement({ name: "Python", canonicalName: "python", importance: "MANDATORY" })],
      [],
      new Map(),
      makeScoringConfig(),
    );
    expect(result.mandatoryMissed).toBe(true);
  });

  it("does not flag a MANDATORY requirement as missed when it has a non-zero semantic score", () => {
    const retrieval = makeRetrievalMap([
      ["SKILL", "python", { text: "some evidence", score: 0.8, featureType: "PROJECT", secondBestScore: 0.3 }],
    ]);
    const result = matchSkills(
      [makeRequirement({ name: "Python", canonicalName: "python", importance: "MANDATORY" })],
      [],
      retrieval,
      makeScoringConfig(),
    );
    expect(result.mandatoryMissed).toBe(false);
  });

  it("weights requirements by importance in the category score", () => {
    const config = makeScoringConfig();
    const result = matchSkills(
      [
        makeRequirement({ name: "React", canonicalName: "react", importance: "MANDATORY" }),
        makeRequirement({ name: "Docker", canonicalName: "docker", importance: "LOW" }),
      ],
      [makeSkill({ canonicalName: "react" })],
      new Map(),
      config,
    );
    // MANDATORY(4)*1.0 + LOW(1)*0 = 4 / 5 total weight = 80
    expect(result.categoryScore).toBe(80);
  });
});
