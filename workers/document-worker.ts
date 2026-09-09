import "@/lib/config/loadEnv";
import { Worker, type Job } from "bullmq";
import { getRedisConnection, closeRedisConnection } from "@/lib/queue/connection";
import { closeMongoConnection } from "@/lib/db/client";
import { resumeRepository, type ResumeRepository } from "@/lib/db/repositories/resumeRepository";
import { downloadFile as s3DownloadFile } from "@/lib/storage/s3Client";
import { extractPdfText as defaultExtractPdfText } from "@/lib/extract/pdfExtractor";
import { extractDocxText as defaultExtractDocxText } from "@/lib/extract/docxExtractor";
import { checkTextQuality as defaultCheckTextQuality } from "@/lib/extraction/textQuality";
import { GeminiExtractionProvider } from "@/lib/extraction/geminiExtractionProvider";
import { normalizeProfile as defaultNormalizeProfile, InvalidExtractionError } from "@/lib/extraction/normalizeProfile";
import {
  studentProfileRepository,
  type StudentProfileRepository,
} from "@/lib/db/repositories/studentProfileRepository";
import { jobRepository, type JobRepository } from "@/lib/db/repositories/jobRepository";
import {
  skillTaxonomyRepository,
  type SkillTaxonomyRepository,
} from "@/lib/db/repositories/skillTaxonomyRepository";
import {
  jobProfileRepository,
  type JobProfileRepository,
} from "@/lib/db/repositories/jobProfileRepository";
import {
  normalizeJobProfile as defaultNormalizeJobProfile,
} from "@/lib/extraction/normalizeJobProfile";
import {
  indexStudentProfile as defaultIndexStudentProfile,
  indexJobProfile as defaultIndexJobProfile,
} from "@/lib/services/embeddingService";
import type { ExtractionProvider } from "@/lib/extraction/extractionProvider";
import { logger } from "@/lib/logger";
import { withTiming } from "@/lib/observability/timing";
import type { DocumentProcessingJobPayload } from "@/lib/queue/jobTypes";

const RESUME_PROMPT_VERSION = "resume-extraction-v1";
const JD_PROMPT_VERSION = "jd-extraction-v1";

type ProcessResumeDeps = {
  resumes: Pick<ResumeRepository, "get" | "updateStatus">;
  studentProfiles: Pick<StudentProfileRepository, "save">;
  skillTaxonomy: Pick<SkillTaxonomyRepository, "listActive">;
  downloadFile: typeof s3DownloadFile;
  extractPdfText: typeof defaultExtractPdfText;
  extractDocxText: typeof defaultExtractDocxText;
  checkTextQuality: typeof defaultCheckTextQuality;
  extractionProvider: ExtractionProvider;
  normalizeProfile: typeof defaultNormalizeProfile;
  indexStudentProfile: typeof defaultIndexStudentProfile;
};

const defaultDeps: ProcessResumeDeps = {
  resumes: resumeRepository,
  studentProfiles: studentProfileRepository,
  skillTaxonomy: skillTaxonomyRepository,
  downloadFile: s3DownloadFile,
  extractPdfText: defaultExtractPdfText,
  extractDocxText: defaultExtractDocxText,
  checkTextQuality: defaultCheckTextQuality,
  extractionProvider: new GeminiExtractionProvider(),
  normalizeProfile: defaultNormalizeProfile,
  indexStudentProfile: defaultIndexStudentProfile,
};

type ProcessJobDeps = {
  jobs: Pick<JobRepository, "get" | "updateStatus">;
  jobProfiles: Pick<JobProfileRepository, "save">;
  downloadFile: typeof s3DownloadFile;
  extractPdfText: typeof defaultExtractPdfText;
  extractDocxText: typeof defaultExtractDocxText;
  checkTextQuality: typeof defaultCheckTextQuality;
  extractionProvider: ExtractionProvider;
  normalizeJobProfile: typeof defaultNormalizeJobProfile;
  indexJobProfile: typeof defaultIndexJobProfile;
};

const defaultJobDeps: ProcessJobDeps = {
  jobs: jobRepository,
  jobProfiles: jobProfileRepository,
  downloadFile: s3DownloadFile,
  extractPdfText: defaultExtractPdfText,
  extractDocxText: defaultExtractDocxText,
  checkTextQuality: defaultCheckTextQuality,
  extractionProvider: new GeminiExtractionProvider(),
  normalizeJobProfile: defaultNormalizeJobProfile,
  indexJobProfile: defaultIndexJobProfile,
};

/**
 * buildPlan.md §17/§59: UPLOADED->EXTRACTING->EXTRACTED->STRUCTURING->
 * VALIDATING->INDEXING->READY (feature #14/#15 wires up the INDEXING step).
 */
export async function processResumeJob(
  resumeId: string,
  deps: ProcessResumeDeps = defaultDeps,
): Promise<void> {
  const resume = await deps.resumes.get(resumeId);
  if (!resume) {
    throw new Error(`Resume not found: ${resumeId}`);
  }
  const log = logger.child({ jobId: resumeId, studentId: resume.studentId, jobType: "RESUME_PROCESS" });

  await withTiming(log, "resume.process", async () => {
  try {
    await deps.resumes.updateStatus(resumeId, "EXTRACTING");

    const buffer = await deps.downloadFile(resume.fileKey);
    const text = resume.fileKey.endsWith(".docx")
      ? await deps.extractDocxText(buffer)
      : await deps.extractPdfText(buffer);

    const quality = deps.checkTextQuality(text);
    if (quality.insufficient) {
      await deps.resumes.updateStatus(resumeId, "FAILED", {
        code: "NEEDS_OCR",
        message: quality.reason ?? "Extracted text quality insufficient",
      });
      return;
    }

    await deps.resumes.updateStatus(resumeId, "EXTRACTED");

    await deps.resumes.updateStatus(resumeId, "STRUCTURING");
    const raw = await deps.extractionProvider.extractResume(text, RESUME_PROMPT_VERSION);

    await deps.resumes.updateStatus(resumeId, "VALIDATING");
    const skillTaxonomy = await deps.skillTaxonomy.listActive();
    let profile;
    try {
      profile = deps.normalizeProfile(raw, {
        studentId: resume.studentId,
        resumeId,
        sourceText: text,
        model: deps.extractionProvider.modelId,
        promptVersion: RESUME_PROMPT_VERSION,
        skillTaxonomy,
      });
    } catch (error) {
      if (error instanceof InvalidExtractionError) {
        await deps.resumes.updateStatus(resumeId, "FAILED", {
          code: "INVALID_EXTRACTION",
          message: error.message,
        });
        return;
      }
      throw error;
    }

    const savedProfile = await deps.studentProfiles.save(profile, { markActive: true });

    await deps.resumes.updateStatus(resumeId, "INDEXING");
    await deps.indexStudentProfile(savedProfile);

    await deps.resumes.updateStatus(resumeId, "READY");
  } catch (error) {
    await deps.resumes.updateStatus(resumeId, "FAILED", {
      code: "EXTRACTION_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error; // rethrow so BullMQ retries, per buildPlan.md §57
  }
  });
}

/**
 * buildPlan.md §21/§113: UPLOADED->EXTRACTING->EXTRACTED->STRUCTURING->
 * VALIDATING->READY. Mirrors processResumeJob but has no evidence-
 * verification step — see normalizeJobProfile.ts for why.
 */
export async function processJobJob(
  jobId: string,
  deps: ProcessJobDeps = defaultJobDeps,
): Promise<void> {
  const job = await deps.jobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  const log = logger.child({ jobId, jobType: "JD_PROCESS" });

  await withTiming(log, "jd.process", async () => {
  try {
    await deps.jobs.updateStatus(jobId, "EXTRACTING");

    const buffer = await deps.downloadFile(job.fileKey);
    const text = job.fileKey.endsWith(".docx")
      ? await deps.extractDocxText(buffer)
      : await deps.extractPdfText(buffer);

    const quality = deps.checkTextQuality(text);
    if (quality.insufficient) {
      await deps.jobs.updateStatus(jobId, "FAILED", {
        code: "NEEDS_OCR",
        message: quality.reason ?? "Extracted text quality insufficient",
      });
      return;
    }

    await deps.jobs.updateStatus(jobId, "EXTRACTED");

    await deps.jobs.updateStatus(jobId, "STRUCTURING");
    const raw = await deps.extractionProvider.extractJD(text, JD_PROMPT_VERSION);

    await deps.jobs.updateStatus(jobId, "VALIDATING");
    let profile;
    try {
      profile = deps.normalizeJobProfile(raw, { jobId });
    } catch (error) {
      if (error instanceof InvalidExtractionError) {
        await deps.jobs.updateStatus(jobId, "FAILED", {
          code: "INVALID_EXTRACTION",
          message: error.message,
        });
        return;
      }
      throw error;
    }

    const savedProfile = await deps.jobProfiles.save(profile);

    await deps.jobs.updateStatus(jobId, "INDEXING");
    await deps.indexJobProfile(savedProfile);

    await deps.jobs.updateStatus(jobId, "READY");
  } catch (error) {
    await deps.jobs.updateStatus(jobId, "FAILED", {
      code: "EXTRACTION_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error; // rethrow so BullMQ retries, per buildPlan.md §57
  }
  });
}

export function startDocumentWorker(): Worker<DocumentProcessingJobPayload> {
  const worker = new Worker<DocumentProcessingJobPayload>(
    "document-processing",
    async (job: Job<DocumentProcessingJobPayload>) => {
      if (job.data.type === "RESUME_PROCESS") {
        await processResumeJob(job.data.resumeId);
      } else if (job.data.type === "JD_PROCESS") {
        await processJobJob(job.data.jobId);
      }
    },
    { connection: getRedisConnection(), concurrency: 3 },
  );

  // buildPlan.md §79: terminal (post-retry) worker failures, distinct from
  // the per-document FAILED status already persisted inside each job fn.
  worker.on("failed", (job, error) => {
    logger.error(
      { queueJobId: job?.id, jobType: job?.data?.type, attemptsMade: job?.attemptsMade, err: error },
      "Document processing job failed",
    );
  });

  return worker;
}

if (require.main === module) {
  const worker = startDocumentWorker();
  logger.info("Document worker started");

  const shutdown = async () => {
    logger.info("Shutting down document worker...");
    await worker.close();
    await closeRedisConnection();
    await closeMongoConnection();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
