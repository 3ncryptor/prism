import { matchEducation } from "@/lib/matching/educationMatcher";
import { makeEducation } from "./fixtures";

describe("matchEducation", () => {
  it("returns 100 when there are no requirements", () => {
    expect(matchEducation(undefined, [makeEducation()]).categoryScore).toBe(100);
    expect(matchEducation([], [makeEducation()]).categoryScore).toBe(100);
  });

  it("matches an equivalent degree spelling (B.Tech vs B.E.)", () => {
    const result = matchEducation(
      [{ degree: ["b.e."], disqualifying: false }],
      [makeEducation({ degree: "B.Tech" })],
    );
    expect(result.categoryScore).toBe(100);
  });

  it("matches an equivalent field spelling (CSE vs Computer Science)", () => {
    const result = matchEducation(
      [{ degree: ["b.tech"], field: ["cse"], disqualifying: false }],
      [makeEducation({ degree: "B.Tech", field: "Computer Science" })],
    );
    expect(result.categoryScore).toBe(100);
  });

  it("fails when the minimum CGPA is not met", () => {
    const result = matchEducation(
      [{ degree: ["b.tech"], minCgpa: 9, disqualifying: false }],
      [makeEducation({ degree: "B.Tech", cgpa: 8.5 })],
    );
    expect(result.categoryScore).toBe(0);
  });

  it("scores partial credit across multiple requirements", () => {
    const result = matchEducation(
      [
        { degree: ["b.tech"], disqualifying: false },
        { degree: ["mba"], disqualifying: false },
      ],
      [makeEducation({ degree: "B.Tech" })],
    );
    expect(result.categoryScore).toBe(50);
  });
});
