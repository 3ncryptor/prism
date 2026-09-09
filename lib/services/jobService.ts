import { jobRepository, type JobRepository } from "@/lib/db/repositories/jobRepository";
import {
  processingJobRepository,
  type ProcessingJobRepository,
} from "@/lib/db/repositories/processingJobRepository";
import { matchRunRepository, type MatchRunRepository } from "@/lib/db/repositories/matchRunRepository";
import { uploadFile as s3UploadFile, buildJobKey } from "@/lib/storage/s3Client";
import { enqueueDocumentProcessing as defaultEnqueueDocumentProcessing } from "@/lib/services/queueService";
import type { Job } from "@/lib/schemas/job";

export const MAX_JD_SIZE_BYTES = 10 * 1024 * 1024; // buildPlan.md §82

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export class InvalidFileTypeError extends Error {
  constructor() {
    super("Only PDF and DOCX job descriptions are accepted.");
    this.name = "InvalidFileTypeError";
  }
}

export class FileTooLargeError extends Error {
  constructor() {
    super(`Job description must be smaller than ${MAX_JD_SIZE_BYTES / (1024 * 1024)}MB.`);
    this.name = "FileTooLargeError";
  }
}

export class JobNotFoundError extends Error {
  constructor() {
    super("Job not found");
    this.name = "JobNotFoundError";
  }
}

export class MatchRunNotFoundError extends Error {
  constructor() {
    super("Match run not found for this job");
    this.name = "MatchRunNotFoundError";
  }
}

export class MatchRunNotCompletedError extends Error {
  constructor() {
    super("Only a completed match run can be published");
    this.name = "MatchRunNotCompletedError";
  }
}

export interface UploadJobInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  title: string;
  company?: string;
}

type Deps = {
  jobs: Pick<JobRepository, "create" | "setFileKey">;
  processingJobs: Pick<ProcessingJobRepository, "create">;
  uploadFile: typeof s3UploadFile;
  enqueueDocumentProcessing: typeof defaultEnqueueDocumentProcessing;
};

const defaultDeps: Deps = {
  jobs: jobRepository,
  processingJobs: processingJobRepository,
  uploadFile: s3UploadFile,
  enqueueDocumentProcessing: defaultEnqueueDocumentProcessing,
};

/** Mirrors resumeService.uploadResume (feature #5) for job descriptions. */
export async function uploadJob(
  createdBy: string,
  file: UploadJobInput,
  deps: Deps = defaultDeps,
): Promise<{ jobId: string; status: Job["status"] }> {
  const extension = ALLOWED_MIME_TYPES[file.mimeType];
  if (!extension) {
    throw new InvalidFileTypeError();
  }
  if (file.size > MAX_JD_SIZE_BYTES) {
    throw new FileTooLargeError();
  }

  const job = await deps.jobs.create({
    title: file.title,
    company: file.company,
    fileKey: "", // finalized below, once the jobId is known
    createdBy,
  });

  const fileKey = buildJobKey(job._id, extension);
  await deps.uploadFile(fileKey, file.buffer, file.mimeType);
  await deps.jobs.setFileKey(job._id, fileKey);

  await deps.processingJobs.create({ type: "JD_PROCESS", targetId: job._id });
  await deps.enqueueDocumentProcessing({ type: "JD_PROCESS", jobId: job._id });

  return { jobId: job._id, status: "QUEUED" };
}

export async function listJobs(filter: { archived?: boolean } = {}): Promise<Job[]> {
  return jobRepository.list(filter);
}

type PublishDeps = {
  jobs: Pick<JobRepository, "get" | "setPublishedRun" | "clearPublishedRun">;
  matchRuns: Pick<MatchRunRepository, "get">;
};

const defaultPublishDeps: PublishDeps = {
  jobs: jobRepository,
  matchRuns: matchRunRepository,
};

/**
 * buildPlan.md §113.2: points the job's visible results at a specific
 * *completed* match run. Re-running matching later does not change this —
 * an admin must call this again to swap in the new run.
 */
export async function publishResults(
  jobId: string,
  matchRunId: string,
  deps: PublishDeps = defaultPublishDeps,
): Promise<Job> {
  const job = await deps.jobs.get(jobId);
  if (!job) throw new JobNotFoundError();

  const run = await deps.matchRuns.get(matchRunId);
  if (!run || run.jobId !== jobId) throw new MatchRunNotFoundError();
  if (run.status !== "COMPLETED") throw new MatchRunNotCompletedError();

  await deps.jobs.setPublishedRun(jobId, matchRunId);
  const updated = await deps.jobs.get(jobId);
  if (!updated) throw new JobNotFoundError();
  return updated;
}

export async function hideResults(jobId: string, deps: PublishDeps = defaultPublishDeps): Promise<Job> {
  const job = await deps.jobs.get(jobId);
  if (!job) throw new JobNotFoundError();

  await deps.jobs.clearPublishedRun(jobId);
  const updated = await deps.jobs.get(jobId);
  if (!updated) throw new JobNotFoundError();
  return updated;
}
