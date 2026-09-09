import { Worker, type Job } from "bullmq";
import { getRedisConnection, closeRedisConnection } from "@/lib/queue/connection";
import { closeMongoConnection } from "@/lib/db/client";
import { resumeRepository, type ResumeRepository } from "@/lib/db/repositories/resumeRepository";
import { downloadFile as s3DownloadFile } from "@/lib/storage/s3Client";
import { extractPdfText as defaultExtractPdfText } from "@/lib/extract/pdfExtractor";
import { extractDocxText as defaultExtractDocxText } from "@/lib/extract/docxExtractor";
import { checkTextQuality as defaultCheckTextQuality } from "@/lib/extraction/textQuality";
import { logger } from "@/lib/logger";
import type { DocumentProcessingJobPayload } from "@/lib/queue/jobTypes";

type ProcessResumeDeps = {
  resumes: Pick<ResumeRepository, "get" | "updateStatus">;
  downloadFile: typeof s3DownloadFile;
  extractPdfText: typeof defaultExtractPdfText;
  extractDocxText: typeof defaultExtractDocxText;
  checkTextQuality: typeof defaultCheckTextQuality;
};

const defaultDeps: ProcessResumeDeps = {
  resumes: resumeRepository,
  downloadFile: s3DownloadFile,
  extractPdfText: defaultExtractPdfText,
  extractDocxText: defaultExtractDocxText,
  checkTextQuality: defaultCheckTextQuality,
};

/**
 * buildPlan.md §17/§59, stopping at EXTRACTED — see
 * docs/agent-artifacts/07-resume-worker/spec.md for why LLM structuring
 * (§19, feature #8) is not part of this function yet.
 */
export async function processResumeJob(
  resumeId: string,
  deps: ProcessResumeDeps = defaultDeps,
): Promise<void> {
  const resume = await deps.resumes.get(resumeId);
  if (!resume) {
    throw new Error(`Resume not found: ${resumeId}`);
  }

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
  } catch (error) {
    await deps.resumes.updateStatus(resumeId, "FAILED", {
      code: "EXTRACTION_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error; // rethrow so BullMQ retries, per buildPlan.md §57
  }
}

export function startDocumentWorker(): Worker<DocumentProcessingJobPayload> {
  return new Worker<DocumentProcessingJobPayload>(
    "document-processing",
    async (job: Job<DocumentProcessingJobPayload>) => {
      if (job.data.type === "RESUME_PROCESS") {
        await processResumeJob(job.data.resumeId);
      }
      // JD_PROCESS is handled starting with the JD pipeline (feature #12+).
    },
    { connection: getRedisConnection(), concurrency: 3 },
  );
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
