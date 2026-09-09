import type { MatchResult } from "@/lib/schemas/matchResult";

export type ExportableMatchResult = MatchResult & { studentName: string };

const CSV_HEADER = [
  "student_name",
  "student_id",
  "score",
  "confidence",
  "bucket",
  "skills_score",
  "experience_score",
  "projects_score",
  "education_score",
  "missing_requirements",
] as const;

/** RFC 4180: quote a field if it contains a comma, quote, or newline; double up embedded quotes. */
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * buildPlan.md §89: admin export columns, in this exact order. Never
 * includes internal model prompts or evidence text — only the scored
 * summary fields. Pure function: no I/O, deterministic.
 */
export function resultsToCsv(results: ExportableMatchResult[]): string {
  const rows = results.map((result) =>
    [
      result.studentName,
      result.studentId,
      result.score.toFixed(2),
      result.confidence.toFixed(2),
      result.bucket,
      result.categoryScores.skills.toFixed(2),
      result.categoryScores.experience.toFixed(2),
      result.categoryScores.projects.toFixed(2),
      result.categoryScores.education.toFixed(2),
      result.missingRequirements.join("; "),
    ]
      .map(escapeCsvField)
      .join(","),
  );

  return [CSV_HEADER.join(","), ...rows].join("\r\n");
}
