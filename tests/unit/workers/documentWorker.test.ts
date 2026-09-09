import { processResumeJob } from "@/workers/document-worker";
import { InvalidExtractionError } from "@/lib/extraction/normalizeProfile";
import type { Resume } from "@/lib/schemas/resume";
import type { StudentProfile } from "@/lib/schemas/studentProfile";

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

function makeProfile(): Omit<StudentProfile, "_id"> {
  return {
    studentId: "student-1",
    resumeId: "resume-1",
    isActive: true,
    education: [],
    skills: [],
    experience: [],
    projects: [],
    certifications: [],
    achievements: [],
    coursework: [],
    languages: [],
    totalExperienceMonths: 0,
    profileVersion: 1,
    extractionMetadata: { model: "gemini-2.0-flash", promptVersion: "resume-extraction-v1", extractedAt: new Date() },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function baseDeps() {
  return {
    resumes: {
      get: jest.fn().mockResolvedValue(makeResume()),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    },
    studentProfiles: {
      save: jest.fn().mockResolvedValue({ ...makeProfile(), _id: "profile-1" }),
    },
    downloadFile: jest.fn().mockResolvedValue(Buffer.from("irrelevant")),
    extractPdfText: jest.fn().mockResolvedValue("realistic long resume text ".repeat(10)),
    extractDocxText: jest.fn().mockResolvedValue("realistic long resume text ".repeat(10)),
    checkTextQuality: jest.fn().mockReturnValue({ insufficient: false }),
    extractionProvider: {
      modelId: "gemini-2.0-flash",
      extractResume: jest.fn().mockResolvedValue({ skills: [] }),
    },
    normalizeProfile: jest.fn().mockReturnValue(makeProfile()),
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

  it("happy path: EXTRACTING -> EXTRACTED -> STRUCTURING -> VALIDATING -> READY", async () => {
    const profile = makeProfile();
    const deps = makeDeps({ normalizeProfile: jest.fn().mockReturnValue(profile) });

    await processResumeJob("resume-1", deps);

    expect(deps.resumes.updateStatus).toHaveBeenNthCalledWith(1, "resume-1", "EXTRACTING");
    expect(deps.extractPdfText).toHaveBeenCalled();
    expect(deps.resumes.updateStatus).toHaveBeenNthCalledWith(2, "resume-1", "EXTRACTED");
    expect(deps.resumes.updateStatus).toHaveBeenNthCalledWith(3, "resume-1", "STRUCTURING");
    expect(deps.extractionProvider.extractResume).toHaveBeenCalled();
    expect(deps.resumes.updateStatus).toHaveBeenNthCalledWith(4, "resume-1", "VALIDATING");
    expect(deps.normalizeProfile).toHaveBeenCalled();
    expect(deps.studentProfiles.save).toHaveBeenCalledWith(profile, { markActive: true });
    expect(deps.resumes.updateStatus).toHaveBeenNthCalledWith(5, "resume-1", "READY");
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

  it("marks FAILED with NEEDS_OCR when text quality is insufficient, without calling the LLM", async () => {
    const deps = makeDeps({
      checkTextQuality: jest.fn().mockReturnValue({ insufficient: true, reason: "too short" }),
    });

    await processResumeJob("resume-1", deps);

    expect(deps.resumes.updateStatus).toHaveBeenNthCalledWith(2, "resume-1", "FAILED", {
      code: "NEEDS_OCR",
      message: "too short",
    });
    expect(deps.extractionProvider.extractResume).not.toHaveBeenCalled();
  });

  it("marks FAILED with INVALID_EXTRACTION when normalization rejects the LLM output, without rethrowing", async () => {
    const deps = makeDeps({
      normalizeProfile: jest.fn().mockImplementation(() => {
        throw new InvalidExtractionError("bad shape");
      }),
    });

    await processResumeJob("resume-1", deps);

    expect(deps.resumes.updateStatus).toHaveBeenNthCalledWith(5, "resume-1", "FAILED", {
      code: "INVALID_EXTRACTION",
      message: "bad shape",
    });
    expect(deps.studentProfiles.save).not.toHaveBeenCalled();
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
