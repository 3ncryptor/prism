import { resultsToCsv, type ExportableMatchResult } from "@/lib/services/csvExportService";

function makeResult(overrides: Partial<ExportableMatchResult> = {}): ExportableMatchResult {
  return {
    _id: "result-1",
    matchRunId: "run-1",
    studentId: "student-1",
    studentName: "Jane Doe",
    jobId: "job-1",
    resumeId: "resume-1",
    score: 85.5,
    bucket: "BEST_FIT",
    confidence: 80,
    eligible: true,
    ineligibilityReasons: [],
    categoryScores: {
      hardRequirements: 1,
      skills: 0.9,
      experience: 0.8,
      projects: 0.7,
      education: 1,
      other: 0.5,
    },
    evidence: [],
    missingRequirements: [],
    scoringConfigVersion: "scoring-v1",
    modelVersions: { extraction: "gemini-3.6-flash", embedding: "gemini-embedding-001" },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("resultsToCsv", () => {
  test("writes the exact header columns from buildPlan.md §89", () => {
    const csv = resultsToCsv([]);
    expect(csv).toBe(
      "student_name,student_id,score,confidence,bucket,skills_score,experience_score,projects_score,education_score,missing_requirements",
    );
  });

  test("formats a single result row with two-decimal scores", () => {
    const csv = resultsToCsv([makeResult()]);
    const [, row] = csv.split("\r\n");
    expect(row).toBe("Jane Doe,student-1,85.50,80.00,BEST_FIT,0.90,0.80,0.70,1.00,");
  });

  test("joins multiple missing requirements with a semicolon", () => {
    const csv = resultsToCsv([makeResult({ missingRequirements: ["AWS certification", "5 years experience"] })]);
    const [, row] = csv.split("\r\n");
    expect(row).toContain("AWS certification; 5 years experience");
  });

  test("quotes and escapes a field containing a comma", () => {
    const csv = resultsToCsv([makeResult({ studentName: "Doe, Jane" })]);
    const [, row] = csv.split("\r\n");
    expect(row.startsWith('"Doe, Jane",')).toBe(true);
  });

  test("quotes and doubles embedded quotes in a field", () => {
    const csv = resultsToCsv([makeResult({ studentName: 'Jane "JD" Doe' })]);
    const [, row] = csv.split("\r\n");
    expect(row.startsWith('"Jane ""JD"" Doe",')).toBe(true);
  });

  test("produces one row per result, in the given order", () => {
    const csv = resultsToCsv([
      makeResult({ studentId: "student-1", studentName: "First" }),
      makeResult({ studentId: "student-2", studentName: "Second" }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("First");
    expect(lines[2]).toContain("Second");
  });
});
