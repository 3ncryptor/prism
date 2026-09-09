import type { JobStatus } from "@/lib/schemas/job";
import type { PillProps } from "@newtonschool/grauity";

type PillColor = NonNullable<PillProps["color"]>;

export function jobStatusLabel(status: JobStatus): string {
  if (status === "READY") return "Ready";
  if (status === "FAILED") return "Failed";
  return "Processing";
}

export function jobStatusColor(status: JobStatus): PillColor {
  if (status === "READY") return "success";
  if (status === "FAILED") return "error";
  return "warning";
}
