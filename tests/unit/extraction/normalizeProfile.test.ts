import { normalizeProfile, InvalidExtractionError } from "@/lib/extraction/normalizeProfile";

const SOURCE_TEXT = `
John Doe
Built REST APIs using Node.js and Express for a course project.
Education: B.Tech Computer Science, XYZ University, 2020-2024, CGPA 8.5.
`;

const CONTEXT = {
  studentId: "student-1",
  resumeId: "resume-1",
  sourceText: SOURCE_TEXT,
  model: "gemini-2.0-flash",
  promptVersion: "resume-extraction-v1",
};

function validRawExtraction(overrides: Record<string, unknown> = {}) {
  return {
    skills: [
      {
        name: "Node.js",
        canonicalName: "NodeJS",
        category: "FRAMEWORK",
        evidence: ["Built REST APIs using Node.js and Express"],
      },
      {
        name: "Photoshop",
        canonicalName: "photoshop",
        category: "TOOL",
        evidence: ["Expert Photoshop user with 10 years experience"], // not in source
      },
    ],
    experience: [],
    projects: [],
    education: [
      {
        degree: "B.Tech",
        field: "Computer Science",
        institution: "XYZ University",
        evidence: ["B.Tech Computer Science, XYZ University"],
      },
    ],
    certifications: [],
    achievements: [],
    coursework: [],
    languages: [],
    ...overrides,
  };
}

describe("normalizeProfile", () => {
  it("throws InvalidExtractionError when the raw shape fails schema validation", () => {
    expect(() => normalizeProfile({ skills: "not-an-array" }, CONTEXT)).toThrow(
      InvalidExtractionError,
    );
  });

  it("discards a skill whose evidence cannot be verified against the source text", () => {
    const profile = normalizeProfile(validRawExtraction(), CONTEXT);

    const names = profile.skills.map((s) => s.name);
    expect(names).toContain("Node.js");
    expect(names).not.toContain("Photoshop");
  });

  it("canonicalizes skill names to lowercase/trimmed form", () => {
    const profile = normalizeProfile(validRawExtraction(), CONTEXT);

    expect(profile.skills[0].canonicalName).toBe("nodejs");
  });

  it("sets studentId/resumeId/isActive/profileVersion and extraction metadata", () => {
    const profile = normalizeProfile(validRawExtraction(), CONTEXT);

    expect(profile.studentId).toBe("student-1");
    expect(profile.resumeId).toBe("resume-1");
    expect(profile.isActive).toBe(true);
    expect(profile.profileVersion).toBe(1);
    expect(profile.extractionMetadata.model).toBe("gemini-2.0-flash");
    expect(profile.extractionMetadata.promptVersion).toBe("resume-extraction-v1");
  });

  it("computes totalExperienceMonths from experience entries", () => {
    const profile = normalizeProfile(
      validRawExtraction({
        experience: [
          {
            company: "Acme",
            role: "Intern",
            description: "Backend intern",
            responsibilities: [],
            technologies: [],
            duration: {},
            months: 6,
          },
        ],
      }),
      CONTEXT,
    );

    expect(profile.totalExperienceMonths).toBe(6);
  });
});
