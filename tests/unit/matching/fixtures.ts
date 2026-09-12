import type { StudentProfile, Skill, Experience, Education, Project } from "@/lib/schemas/studentProfile";
import type { JobProfile, Requirement } from "@/lib/schemas/jobProfile";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import type { RetrievedEvidence } from "@/lib/services/vectorStoreService";
import type { RetrievalMap } from "@/lib/matching/types";
import { retrievalKey } from "@/lib/matching/types";

export function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    name: "React",
    canonicalName: "react",
    category: "FRAMEWORK",
    evidence: ["Built the frontend using React"],
    ...overrides,
  };
}

export function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    name: "React",
    canonicalName: "react",
    category: "FRAMEWORK",
    importance: "HIGH",
    ...overrides,
  };
}

export function makeExperience(overrides: Partial<Experience> = {}): Experience {
  return {
    company: "Acme Corp",
    role: "Backend Intern",
    description: "Built REST APIs using Node.js and Express",
    responsibilities: ["Built REST APIs"],
    technologies: ["Node.js", "Express"],
    duration: { start: "Jan 2024", end: "Jun 2024" },
    months: 6,
    ...overrides,
  };
}

export function makeEducation(overrides: Partial<Education> = {}): Education {
  return {
    degree: "B.Tech",
    field: "Computer Science",
    institution: "NIT",
    endYear: 2025,
    cgpa: 8.5,
    evidence: ["B.Tech Computer Science, NIT"],
    ...overrides,
  };
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    title: "StudyBuddy",
    description: "Real-time collaborative study platform",
    technologies: ["Next.js", "MongoDB"],
    responsibilities: [],
    outcomes: [],
    ...overrides,
  };
}

export function makeStudentProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    _id: "profile-1",
    studentId: "student-1",
    resumeId: "resume-1",
    isActive: true,
    education: [makeEducation()],
    skills: [makeSkill()],
    experience: [makeExperience()],
    projects: [makeProject()],
    certifications: [],
    achievements: [],
    coursework: [],
    languages: [],
    totalExperienceMonths: 6,
    profileVersion: 1,
    extractionMetadata: {
      model: "gemini-3.6-flash",
      promptVersion: "resume-extraction-v1",
      extractedAt: new Date(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeJobProfile(overrides: Partial<JobProfile> = {}): JobProfile {
  return {
    _id: "jobprofile-1",
    jobId: "job-1",
    title: "Backend Engineer",
    requiredSkills: [makeRequirement()],
    preferredSkills: [],
    responsibilities: [],
    constraints: [],
    semanticRequirements: [],
    profileVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeScoringConfig(overrides: Partial<ScoringConfig> = {}): ScoringConfig {
  return {
    _id: "config-1",
    version: "scoring-v1",
    isActive: true,
    weights: {
      hardRequirements: 0.25,
      skills: 0.3,
      experience: 0.15,
      projects: 0.15,
      education: 0.1,
      other: 0.05,
    },
    buckets: { bestFit: 80, moderateFit: 60 },
    semanticThresholds: { strong: 0.85, possible: 0.75, weak: 0.55 },
    mandatoryPenalty: 0.75,
    createdBy: "admin-1",
    createdAt: new Date(),
    ...overrides,
  };
}

export function makeRetrievedEvidence(overrides: Partial<RetrievedEvidence> = {}): RetrievedEvidence {
  return {
    text: "Built REST APIs using Node.js",
    score: 0.9,
    featureType: "PROJECT",
    secondBestScore: 0.5,
    ...overrides,
  };
}

export function makeRetrievalMap(entries: [string, string, RetrievedEvidence][] = []): RetrievalMap {
  const map: RetrievalMap = new Map();
  for (const [featureType, featureId, evidence] of entries) {
    map.set(retrievalKey(featureType, featureId), evidence);
  }
  return map;
}
