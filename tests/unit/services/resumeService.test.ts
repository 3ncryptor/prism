import {
  uploadResume,
  MAX_RESUME_SIZE_BYTES,
  InvalidFileTypeError,
  FileTooLargeError,
} from "@/lib/services/resumeService";
import type { Resume } from "@/lib/schemas/resume";

function makeResume(overrides: Partial<Resume> = {}): Resume {
  return {
    _id: "resume-1",
    studentId: "student-1",
    label: "Software Dev Resume",
    jobRole: null,
    fileKey: "",
    originalName: "resume.pdf",
    isActive: false,
    status: "UPLOADED",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeDeps() {
  const created = makeResume();
  return {
    resumes: {
      create: jest.fn().mockResolvedValue(created),
      setFileKey: jest.fn().mockResolvedValue(undefined),
      getActiveByStudent: jest.fn(),
      listByStudent: jest.fn(),
    },
    processingJobs: {
      create: jest.fn().mockResolvedValue({}),
    },
    uploadFile: jest.fn().mockResolvedValue(undefined),
    enqueueDocumentProcessing: jest.fn().mockResolvedValue(undefined),
  };
}

const VALID_FILE = {
  buffer: Buffer.from("%PDF-1.4 fake"),
  label: "Software Dev Resume",
  jobRole: null,
  originalName: "resume.pdf",
  mimeType: "application/pdf",
  size: 1024,
};

describe("uploadResume", () => {
  it("rejects an unsupported mime type without touching storage or the DB", async () => {
    const deps = makeDeps();

    await expect(
      uploadResume("student-1", { ...VALID_FILE, mimeType: "image/png" }, deps),
    ).rejects.toBeInstanceOf(InvalidFileTypeError);

    expect(deps.resumes.create).not.toHaveBeenCalled();
    expect(deps.uploadFile).not.toHaveBeenCalled();
  });

  it("rejects a file over the size limit", async () => {
    const deps = makeDeps();

    await expect(
      uploadResume(
        "student-1",
        { ...VALID_FILE, size: MAX_RESUME_SIZE_BYTES + 1 },
        deps,
      ),
    ).rejects.toBeInstanceOf(FileTooLargeError);

    expect(deps.resumes.create).not.toHaveBeenCalled();
  });

  it("uploads without deactivating other resumes (multi-resume, feature 27d), sets the file key, and creates a processing job", async () => {
    const deps = makeDeps();

    const result = await uploadResume("student-1", VALID_FILE, deps);

    expect(deps.resumes.create).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: "student-1", label: "Software Dev Resume", jobRole: null }),
    );
    expect(deps.uploadFile).toHaveBeenCalledWith(
      "resumes/student-1/resume-1/original.pdf",
      VALID_FILE.buffer,
      "application/pdf",
    );
    expect(deps.resumes.setFileKey).toHaveBeenCalledWith(
      "resume-1",
      "resumes/student-1/resume-1/original.pdf",
    );
    expect(deps.processingJobs.create).toHaveBeenCalledWith({
      type: "RESUME_PROCESS",
      targetId: "resume-1",
    });
    expect(deps.enqueueDocumentProcessing).toHaveBeenCalledWith({
      type: "RESUME_PROCESS",
      resumeId: "resume-1",
    });
    expect(result).toEqual({ resumeId: "resume-1", status: "QUEUED" });
  });

  it("accepts a DOCX file", async () => {
    const deps = makeDeps();

    await uploadResume(
      "student-1",
      {
        ...VALID_FILE,
        buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]),
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      deps,
    );

    expect(deps.uploadFile).toHaveBeenCalledWith(
      "resumes/student-1/resume-1/original.docx",
      expect.anything(),
      expect.anything(),
    );
  });
});
