import { resumeRepository, type ResumeRepository } from "@/lib/db/repositories/resumeRepository";
import {
  studentProfileRepository,
  type StudentProfileRepository,
} from "@/lib/db/repositories/studentProfileRepository";
import {
  processingJobRepository,
  type ProcessingJobRepository,
} from "@/lib/db/repositories/processingJobRepository";
import { uploadFile as s3UploadFile, buildResumeKey } from "@/lib/storage/s3Client";
import { enqueueDocumentProcessing as defaultEnqueueDocumentProcessing } from "@/lib/services/queueService";
import { matchesFileSignature, type ValidatedFileExtension } from "@/lib/services/fileSignatureValidator";
import type { Resume } from "@/lib/schemas/resume";

export const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024; // buildPlan.md §82

const ALLOWED_MIME_TYPES: Record<string, ValidatedFileExtension> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export class InvalidFileTypeError extends Error {
  constructor() {
    super("Only PDF and DOCX resumes are accepted.");
    this.name = "InvalidFileTypeError";
  }
}

export class FileTooLargeError extends Error {
  constructor() {
    super(`Resume must be smaller than ${MAX_RESUME_SIZE_BYTES / (1024 * 1024)}MB.`);
    this.name = "FileTooLargeError";
  }
}

export class ResumeNotFoundError extends Error {
  constructor() {
    super("Resume not found");
    this.name = "ResumeNotFoundError";
  }
}

export class ResumeAccessDeniedError extends Error {
  constructor() {
    super("You don't have access to this resume");
    this.name = "ResumeAccessDeniedError";
  }
}

export class ResumeNotReadyError extends Error {
  constructor() {
    super("Only a fully-processed resume can be published");
    this.name = "ResumeNotReadyError";
  }
}

export interface UploadResumeInput {
  buffer: Buffer;
  label: string;
  originalName: string;
  mimeType: string;
  size: number;
}

type Deps = {
  resumes: Pick<
    ResumeRepository,
    "create" | "deactivateAllForStudent" | "setFileKey" | "getActiveByStudent" | "listByStudent"
  >;
  processingJobs: Pick<ProcessingJobRepository, "create">;
  uploadFile: typeof s3UploadFile;
  enqueueDocumentProcessing: typeof defaultEnqueueDocumentProcessing;
};

const defaultDeps: Deps = {
  resumes: resumeRepository,
  processingJobs: processingJobRepository,
  uploadFile: s3UploadFile,
  enqueueDocumentProcessing: defaultEnqueueDocumentProcessing,
};

/**
 * buildPlan.md §16: must return before extraction *completes* — enqueueing
 * is fire-and-forget from the caller's perspective; nothing here awaits
 * the worker (feature #7, which doesn't exist yet, so this job sits
 * QUEUED with no consumer until then).
 */
export async function uploadResume(
  studentId: string,
  file: UploadResumeInput,
  deps: Deps = defaultDeps,
): Promise<{ resumeId: string; status: Resume["status"] }> {
  const extension = ALLOWED_MIME_TYPES[file.mimeType];
  if (!extension) {
    throw new InvalidFileTypeError();
  }
  if (file.size > MAX_RESUME_SIZE_BYTES) {
    throw new FileTooLargeError();
  }
  if (!matchesFileSignature(file.buffer, extension)) {
    throw new InvalidFileTypeError();
  }

  const resume = await deps.resumes.create({
    studentId,
    label: file.label,
    fileKey: "", // finalized below, once the resumeId is known (§5.1 key convention)
    originalName: file.originalName,
  });

  const fileKey = buildResumeKey(studentId, resume._id, extension);
  await deps.uploadFile(fileKey, file.buffer, file.mimeType);
  await deps.resumes.setFileKey(resume._id, fileKey);

  await deps.processingJobs.create({ type: "RESUME_PROCESS", targetId: resume._id });
  await deps.enqueueDocumentProcessing({ type: "RESUME_PROCESS", resumeId: resume._id });

  return { resumeId: resume._id, status: "QUEUED" };
}

export async function getActiveResume(studentId: string): Promise<Resume | null> {
  return resumeRepository.getActiveByStudent(studentId);
}

export async function listResumes(studentId: string): Promise<Resume[]> {
  return resumeRepository.listByStudent(studentId);
}

type PublishDeps = {
  resumes: Pick<ResumeRepository, "get" | "setActive" | "setIsActive">;
  studentProfiles: Pick<StudentProfileRepository, "setActiveForResume">;
};

const defaultPublishDeps: PublishDeps = {
  resumes: resumeRepository,
  studentProfiles: studentProfileRepository,
};

/**
 * docs/screens.md §4.6 (feature 27d): the student-controlled "Publish for
 * matching" toggle. Publishing un-publishes any other resume for the same
 * student — see resumeRepository.setActive's docstring for why (the
 * single-active invariant the matching engine still relies on until 27e).
 */
export async function setResumePublishStatus(
  resumeId: string,
  studentId: string,
  isPublished: boolean,
  deps: PublishDeps = defaultPublishDeps,
): Promise<Resume> {
  const resume = await deps.resumes.get(resumeId);
  if (!resume) throw new ResumeNotFoundError();
  if (resume.studentId !== studentId) throw new ResumeAccessDeniedError();
  if (isPublished && resume.status !== "READY") throw new ResumeNotReadyError();

  if (isPublished) {
    await deps.resumes.setActive(resumeId, studentId);
  } else {
    await deps.resumes.setIsActive(resumeId, false);
  }
  await deps.studentProfiles.setActiveForResume(studentId, resumeId, isPublished);

  const updated = await deps.resumes.get(resumeId);
  if (!updated) throw new ResumeNotFoundError();
  return updated;
}
