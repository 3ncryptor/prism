import type { Resume, ResumeStatus } from "@/lib/schemas/resume";
import type { BadgeProps } from "@/lib/ui/Badge";

type BadgeTone = NonNullable<BadgeProps["tone"]>;

const TERMINAL_STATUSES: ResumeStatus[] = ["READY", "FAILED"];

export function isTerminalStatus(status: ResumeStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function resumeStatusLabel(status: ResumeStatus): string {
  if (status === "READY") return "Ready";
  if (status === "FAILED") return "Failed";
  return "Processing";
}

export function resumeStatusColor(status: ResumeStatus): BadgeTone {
  if (status === "READY") return "success";
  if (status === "FAILED") return "error";
  return "warning";
}

/**
 * docs/screens.md §8.6 (feature 27m). Known worker error codes
 * (workers/document-worker.ts) get a real sentence; any other code — or a
 * raw, non-student-facing message like the literal "aborted" seen when a
 * job is interrupted mid-run — falls back to a generic retry message
 * rather than surfacing the raw error text.
 */
const FAILURE_MESSAGES: Record<string, string> = {
  NEEDS_OCR: "This resume looks like a scanned image. Try re-uploading a text-based PDF instead.",
  INVALID_EXTRACTION: "We couldn't extract a valid profile from this resume. Please check the file and try again.",
  EXTRACTION_QUOTA_EXCEEDED: "Our extraction service is temporarily at capacity. Please try again in a few minutes.",
  EXTRACTION_ERROR: "Something went wrong while processing this resume. Please try again.",
};

const DEFAULT_FAILURE_MESSAGE = "Processing was interrupted — try re-uploading.";

export function humanizeResumeFailure(error: Resume["error"]): string {
  if (!error) return DEFAULT_FAILURE_MESSAGE;
  return FAILURE_MESSAGES[error.code] ?? DEFAULT_FAILURE_MESSAGE;
}
