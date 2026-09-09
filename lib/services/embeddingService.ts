import { GeminiEmbeddingProvider } from "@/lib/embeddings/geminiEmbeddingProvider";
import type { EmbeddingProvider } from "@/lib/embeddings/embeddingProvider";
import type { VectorPoint } from "@/lib/vectorStore/vectorStoreProvider";
import {
  upsertStudentFeatures,
  upsertJobFeatures,
} from "@/lib/services/vectorStoreService";
import type { StudentProfile } from "@/lib/schemas/studentProfile";
import type { JobProfile } from "@/lib/schemas/jobProfile";
import { retrievalKey } from "@/lib/matching/types";

export type FeatureType = "SKILL" | "PROJECT" | "EXPERIENCE" | "RESPONSIBILITY" | "SEMANTIC_REQUIREMENT";

export interface FeatureText {
  featureType: FeatureType;
  featureId: string;
  text: string;
  canonicalSkills: string[];
}

/** buildPlan.md §5.5: embed atomic/meaningful features, not the whole document. */
export function buildStudentFeatureTexts(profile: StudentProfile): FeatureText[] {
  const features: FeatureText[] = [];

  profile.skills.forEach((skill, index) => {
    features.push({
      featureType: "SKILL",
      featureId: `${index}`,
      text: skill.name,
      canonicalSkills: [skill.canonicalName],
    });
  });

  profile.projects.forEach((project, index) => {
    features.push({
      featureType: "PROJECT",
      featureId: `${index}`,
      text: [project.title, project.description, ...project.responsibilities].join(". "),
      canonicalSkills: project.technologies,
    });
  });

  profile.experience.forEach((experience, index) => {
    features.push({
      featureType: "EXPERIENCE",
      featureId: `${index}`,
      text: [experience.role, experience.company, experience.description, ...experience.responsibilities].join(". "),
      canonicalSkills: experience.technologies,
    });
  });

  return features;
}

export function buildJobFeatureTexts(job: JobProfile): FeatureText[] {
  const features: FeatureText[] = [];

  [...job.requiredSkills, ...job.preferredSkills].forEach((requirement, index) => {
    features.push({
      featureType: "SKILL",
      featureId: requirement.canonicalName || `${index}`,
      text: requirement.name,
      canonicalSkills: [requirement.canonicalName],
    });
  });

  job.responsibilities.forEach((responsibility, index) => {
    features.push({
      featureType: "RESPONSIBILITY",
      featureId: `${index}`,
      text: responsibility,
      canonicalSkills: [],
    });
  });

  job.semanticRequirements.forEach((requirement, index) => {
    features.push({
      featureType: "SEMANTIC_REQUIREMENT",
      featureId: `${index}`,
      text: requirement.description,
      canonicalSkills: requirement.canonicalSkillHints ?? [],
    });
  });

  return features;
}

function defaultEmbeddingProvider(): EmbeddingProvider {
  return new GeminiEmbeddingProvider();
}

/**
 * buildPlan.md §43: called when a resume is uploaded/replaced — never
 * recomputed just because a JD was uploaded. Deterministic point IDs
 * (buildPlan.md §56) make a retried worker job idempotent (upsert, not
 * duplicate).
 */
export async function indexStudentProfile(
  profile: StudentProfile,
  embeddingProvider: EmbeddingProvider = defaultEmbeddingProvider(),
): Promise<void> {
  const features = buildStudentFeatureTexts(profile);
  if (features.length === 0) return;

  const vectors = await embeddingProvider.embed(features.map((f) => f.text));
  const points: VectorPoint[] = features.map((feature, index) => ({
    id: `student:${profile.studentId}:resume:${profile.resumeId}:${feature.featureType}:${feature.featureId}`,
    vector: vectors[index],
    metadata: {
      studentId: profile.studentId,
      resumeId: profile.resumeId,
      featureType: feature.featureType,
      featureId: feature.featureId,
      canonicalSkills: feature.canonicalSkills,
      text: feature.text,
    },
  }));

  await upsertStudentFeatures(points);
}

/** buildPlan.md §43: called when a JD is uploaded/updated. */
export async function indexJobProfile(
  profile: JobProfile,
  embeddingProvider: EmbeddingProvider = defaultEmbeddingProvider(),
): Promise<void> {
  const features = buildJobFeatureTexts(profile);
  if (features.length === 0) return;

  const vectors = await embeddingProvider.embed(features.map((f) => f.text));
  const points: VectorPoint[] = features.map((feature, index) => ({
    id: `job:${profile.jobId}:${feature.featureType}:${feature.featureId}`,
    vector: vectors[index],
    metadata: {
      jobId: profile.jobId,
      featureType: feature.featureType,
      featureId: feature.featureId,
      canonicalSkills: feature.canonicalSkills,
      text: feature.text,
    },
  }));

  await upsertJobFeatures(points);
}

/**
 * buildPlan.md §43: embeds each JD requirement/responsibility/semantic-
 * requirement text exactly once per match run, keyed the same way as
 * embeddingService's job feature IDs so lib/matching/* can look them up
 * without doing I/O itself. Reused across every student in the run.
 */
export async function embedJobRequirements(
  job: JobProfile,
  embeddingProvider: EmbeddingProvider = defaultEmbeddingProvider(),
): Promise<{ key: string; vector: number[] }[]> {
  const features = buildJobFeatureTexts(job);
  if (features.length === 0) return [];

  const vectors = await embeddingProvider.embed(features.map((f) => f.text));
  return features.map((feature, index) => ({
    key: retrievalKey(feature.featureType, feature.featureId),
    vector: vectors[index],
  }));
}
