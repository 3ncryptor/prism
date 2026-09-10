import type { JobStatus } from "@/lib/schemas/job";
import type { BadgeProps } from "@/lib/ui/Badge";

type BadgeTone = NonNullable<BadgeProps["tone"]>;

export function jobStatusLabel(status: JobStatus): string {
  if (status === "READY") return "Ready";
  if (status === "FAILED") return "Failed";
  return "Processing";
}

export function jobStatusColor(status: JobStatus): BadgeTone {
  if (status === "READY") return "success";
  if (status === "FAILED") return "error";
  return "warning";
}
