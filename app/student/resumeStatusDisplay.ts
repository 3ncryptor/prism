import type { ResumeStatus } from "@/lib/schemas/resume";
import type { PillProps } from "@newtonschool/grauity";

type PillColor = NonNullable<PillProps["color"]>;

const TERMINAL_STATUSES: ResumeStatus[] = ["READY", "FAILED"];

export function isTerminalStatus(status: ResumeStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function resumeStatusLabel(status: ResumeStatus): string {
  if (status === "READY") return "Ready";
  if (status === "FAILED") return "Failed";
  return "Processing";
}

export function resumeStatusColor(status: ResumeStatus): PillColor {
  if (status === "READY") return "success";
  if (status === "FAILED") return "error";
  return "warning";
}
