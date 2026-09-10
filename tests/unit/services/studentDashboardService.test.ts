import { getStudentDashboardData } from "@/lib/services/studentDashboardService";
import type { Resume } from "@/lib/schemas/resume";
import type { JobRoleTaxonomyEntry } from "@/lib/schemas/jobRoleTaxonomy";
import type { MatchResult } from "@/lib/schemas/matchResult";
import type { Job } from "@/lib/schemas/job";
import type { User } from "@/lib/schemas/user";
import type { StudentProfile, Skill } from "@/lib/schemas/studentProfile";

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return { name: "Python", canonicalName: "python", category: "LANGUAGE", evidence: [], ...overrides };
}

function makeProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    _id: "profile-1",
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
    extractionMetadata: { model: "gemini", promptVersion: "v1", extractedAt: new Date() },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeResume(overrides: Partial<Resume> = {}): Resume {
  return {
    _id: "resume-1",
    studentId: "student-1",
    label: "General",
    jobRole: null,
    fileKey: "key",
    originalName: "resume.pdf",
    isActive: true,
    status: "READY",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRole(overrides: Partial<JobRoleTaxonomyEntry> = {}): JobRoleTaxonomyEntry {
  return {
    _id: "role-1",
    canonicalName: "data science",
    displayName: "Data Science",
    isActive: true,
    createdBy: "admin-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    _id: "job-1",
    title: "ML Engineer",
    company: "DataCorp",
    fileKey: "jobs/job-1/original.pdf",
    createdBy: "admin-1",
    status: "READY",
    archived: false,
    publishedMatchRunId: "run-1",
    publishedAt: new Date(),
    listingStatus: "LIVE",
    leaderboardSize: 10,
    jobRole: "data science",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeMatchResult(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    _id: "result-1",
    matchRunId: "run-1",
    studentId: "student-1",
    jobId: "job-1",
    resumeId: "resume-1",
    score: 80,
    bucket: "BEST_FIT",
    confidence: 0.9,
    eligible: true,
    ineligibilityReasons: [],
    categoryScores: { hardRequirements: 1, skills: 1, experience: 1, projects: 1, education: 1, other: 1 },
    evidence: [],
    missingRequirements: [],
    scoringConfigVersion: "v1",
    modelVersions: { extraction: "gemini-1", embedding: "gemini-1" },
    createdAt: new Date(),
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    _id: "student-1",
    email: "student1@prism.dev",
    name: "Student One",
    role: "STUDENT",
    passwordHash: "irrelevant",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function baseDeps() {
  return {
    resumes: { listByStudent: jest.fn().mockResolvedValue([]) },
    jobRoles: { listActive: jest.fn().mockResolvedValue([]) },
    matchResults: { listByStudent: jest.fn().mockResolvedValue([]) },
    jobs: { get: jest.fn() },
    users: { findById: jest.fn().mockResolvedValue(null) },
    studentProfiles: { getByResumeId: jest.fn().mockResolvedValue(null) },
  };
}

function makeDeps(overrides: Partial<ReturnType<typeof baseDeps>> = {}) {
  return { ...baseDeps(), ...overrides };
}

describe("getStudentDashboardData", () => {
  it("marks a role published only when an active resume is tagged with it", async () => {
    const deps = makeDeps({
      resumes: {
        listByStudent: jest.fn().mockResolvedValue([
          makeResume({ jobRole: "data science", isActive: true }),
          makeResume({ _id: "resume-2", jobRole: "design", isActive: false }),
        ]),
      },
      jobRoles: {
        listActive: jest.fn().mockResolvedValue([
          makeRole({ canonicalName: "data science", displayName: "Data Science" }),
          makeRole({ canonicalName: "design", displayName: "Design" }),
        ]),
      },
    });

    const result = await getStudentDashboardData("student-1", deps);

    expect(result.roleCoverage).toEqual([
      { canonicalName: "data science", displayName: "Data Science", isPublished: true },
      { canonicalName: "design", displayName: "Design", isPublished: false },
    ]);
    expect(result.publishedRoleCount).toBe(1);
    expect(result.totalRoleCount).toBe(2);
  });

  it("only counts results for jobs whose publishedMatchRunId matches the student's result", async () => {
    const publishedResult = makeMatchResult({ matchRunId: "run-1", bucket: "BEST_FIT" });
    const underReviewResult = makeMatchResult({ _id: "result-2", jobId: "job-2", matchRunId: "run-old" });

    const deps = makeDeps({
      matchResults: { listByStudent: jest.fn().mockResolvedValue([publishedResult, underReviewResult]) },
      jobs: {
        get: jest.fn().mockImplementation(async (jobId: string) => {
          if (jobId === "job-1") return makeJob({ _id: "job-1", publishedMatchRunId: "run-1" });
          if (jobId === "job-2") return makeJob({ _id: "job-2", publishedMatchRunId: "run-current-not-old" });
          return null;
        }),
      },
    });

    const result = await getStudentDashboardData("student-1", deps);

    expect(result.bucketCounts).toEqual({ BEST_FIT: 1, MODERATE_FIT: 0, LOW_FIT: 0 });
    expect(result.recentResults).toEqual([
      { jobId: "job-1", title: "ML Engineer", company: "DataCorp", bucket: "BEST_FIT", score: 80 },
    ]);
  });

  it("computes profile completion as a percentage of filled optional fields", async () => {
    const deps = makeDeps({
      users: {
        findById: jest.fn().mockResolvedValue(
          makeUser({ phone: "123", linkedinUrl: "https://linkedin.com/x" }),
        ),
      },
    });

    const result = await getStudentDashboardData("student-1", deps);

    // 2 of 7 fields filled
    expect(result.profileCompletionPercent).toBe(Math.round((2 / 7) * 100));
  });

  it("returns 0% profile completion when the user isn't found", async () => {
    const deps = makeDeps({ users: { findById: jest.fn().mockResolvedValue(null) } });
    const result = await getStudentDashboardData("student-1", deps);
    expect(result.profileCompletionPercent).toBe(0);
  });

  it("caps recent results at 3, most recent first", async () => {
    const results = [1, 2, 3, 4].map((n) =>
      makeMatchResult({
        _id: `result-${n}`,
        jobId: `job-${n}`,
        matchRunId: `run-${n}`,
        createdAt: new Date(2026, 0, n),
      }),
    );
    const deps = makeDeps({
      matchResults: { listByStudent: jest.fn().mockResolvedValue(results) },
      jobs: {
        get: jest.fn().mockImplementation(async (jobId: string) => {
          const n = jobId.split("-")[1];
          return makeJob({ _id: jobId, title: `Job ${n}`, publishedMatchRunId: `run-${n}` });
        }),
      },
    });

    const result = await getStudentDashboardData("student-1", deps);

    expect(result.recentResults).toHaveLength(3);
    expect(result.recentResults[0].title).toBe("Job 4");
  });
});

describe("getStudentDashboardData skills", () => {
  it("unions skills across active resumes' profiles, deduplicated by canonicalName", async () => {
    const deps = makeDeps({
      resumes: {
        listByStudent: jest.fn().mockResolvedValue([
          makeResume({ _id: "resume-1", isActive: true }),
          makeResume({ _id: "resume-2", isActive: true }),
          makeResume({ _id: "resume-3", isActive: false }),
        ]),
      },
      studentProfiles: {
        getByResumeId: jest.fn().mockImplementation(async (resumeId: string) => {
          if (resumeId === "resume-1") {
            return makeProfile({ resumeId, skills: [makeSkill({ canonicalName: "python" })] });
          }
          if (resumeId === "resume-2") {
            return makeProfile({
              resumeId,
              skills: [makeSkill({ canonicalName: "python" }), makeSkill({ canonicalName: "react", name: "React" })],
            });
          }
          return null;
        }),
      },
    });

    const result = await getStudentDashboardData("student-1", deps);

    expect(result.skills.map((skill) => skill.canonicalName).sort()).toEqual(["python", "react"]);
    // resume-3 is inactive, so its profile is never even queried
    expect(deps.studentProfiles.getByResumeId).toHaveBeenCalledTimes(2);
  });
});
