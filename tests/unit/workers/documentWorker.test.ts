import { processResumeJob } from "@/workers/document-worker";
import type { Resume } from "@/lib/schemas/resume";

function makeResume(overrides: Partial<Resume> = {}): Resume {
  return {
    _id: "resume-1",
    studentId: "student-1",
    fileKey: "resumes/student-1/resume-1/original.pdf",
    originalName: "resume.pdf",
    isActive: true,
    status: "QUEUED",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function baseDeps() {
  return {
    resumes: {
      get: jest.fn().mockResolvedValue(makeResume()),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    },
    downloadFile: jest.fn().mockResolvedValue(Buffer.from("irrelevant")),
    extractPdfText: jest.fn().mockResolvedValue("realistic long resume text ".repeat(10)),
    extractDocxText: jest.fn().mockResolvedValue("realistic long resume text ".repeat(10)),
    checkTextQuality: jest.fn().mockReturnValue({ insufficient: false }),
  };
}

function makeDeps(overrides: Partial<ReturnType<typeof baseDeps>> = {}) {
  return { ...baseDeps(), ...overrides };
}

describe("processResumeJob", () => {
  it("throws if the resume does not exist", async () => {
    const deps = makeDeps({ resumes: { get: jest.fn().mockResolvedValue(null), updateStatus: jest.fn() } });

    await expect(processResumeJob("missing", deps)).rejects.toThrow(/not found/);
  });

  it("happy path: EXTRACTING then EXTRACTED, using the PDF extractor for a .pdf key", async () => {
    const deps = makeDeps();

    await processResumeJob("resume-1", deps);

    expect(deps.resumes.updateStatus).toHaveBeenNthCalledWith(1, "resume-1", "EXTRACTING");
    expect(deps.extractPdfText).toHaveBeenCalled();
    expect(deps.extractDocxText).not.toHaveBeenCalled();
    expect(deps.resumes.updateStatus).toHaveBeenNthCalledWith(2, "resume-1", "EXTRACTED");
  });

  it("uses the DOCX extractor for a .docx key", async () => {
    const deps = makeDeps({
      resumes: {
        get: jest.fn().mockResolvedValue(
          makeResume({ fileKey: "resumes/student-1/resume-1/original.docx" }),
        ),
        updateStatus: jest.fn().mockResolvedValue(undefined),
      },
    });

    await processResumeJob("resume-1", deps);

    expect(deps.extractDocxText).toHaveBeenCalled();
    expect(deps.extractPdfText).not.toHaveBeenCalled();
  });

  it("marks FAILED with NEEDS_OCR when text quality is insufficient, without throwing", async () => {
    const deps = makeDeps({
      checkTextQuality: jest.fn().mockReturnValue({ insufficient: true, reason: "too short" }),
    });

    await processResumeJob("resume-1", deps);

    expect(deps.resumes.updateStatus).toHaveBeenNthCalledWith(2, "resume-1", "FAILED", {
      code: "NEEDS_OCR",
      message: "too short",
    });
  });

  it("marks FAILED with EXTRACTION_ERROR and rethrows on an unexpected error", async () => {
    const deps = makeDeps({
      downloadFile: jest.fn().mockRejectedValue(new Error("S3 unreachable")),
    });

    await expect(processResumeJob("resume-1", deps)).rejects.toThrow("S3 unreachable");

    expect(deps.resumes.updateStatus).toHaveBeenNthCalledWith(2, "resume-1", "FAILED", {
      code: "EXTRACTION_ERROR",
      message: "S3 unreachable",
    });
  });
});
