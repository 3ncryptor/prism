import { PineconeVectorStoreProvider } from "@/lib/vectorStore/pineconeVectorStoreProvider";
import type { VectorPoint, VectorStoreProvider } from "@/lib/vectorStore/vectorStoreProvider";
import type { RetrievalMap } from "@/lib/matching/types";

export const STUDENT_FEATURES_NAMESPACE = "student-features";
export const JOB_FEATURES_NAMESPACE = "job-features";

let cachedProvider: VectorStoreProvider | null = null;

function getProvider(): VectorStoreProvider {
  if (!cachedProvider) {
    cachedProvider = new PineconeVectorStoreProvider();
  }
  return cachedProvider;
}

export async function upsertStudentFeatures(points: VectorPoint[]): Promise<void> {
  await getProvider().upsert(STUDENT_FEATURES_NAMESPACE, points);
}

export async function upsertJobFeatures(points: VectorPoint[]): Promise<void> {
  await getProvider().upsert(JOB_FEATURES_NAMESPACE, points);
}

export interface RetrievedEvidence {
  text: string;
  score: number;
  featureType: string;
  secondBestScore: number;
}

/**
 * buildPlan.md §16/§42: for one student, search their own indexed features
 * for the best match to a single (already-embedded) JD requirement vector.
 * Returns the top-2 scores so callers can compute a semantic margin
 * (buildPlan.md §35 "matching clarity" confidence input).
 */
export async function retrieveBestStudentEvidence(
  studentId: string,
  requirementVector: number[],
  provider: VectorStoreProvider = getProvider(),
): Promise<RetrievedEvidence | null> {
  const matches = await provider.search(
    STUDENT_FEATURES_NAMESPACE,
    requirementVector,
    { studentId },
    2,
  );
  if (matches.length === 0) return null;

  return {
    text: String(matches[0].metadata.text ?? ""),
    score: matches[0].score,
    featureType: String(matches[0].metadata.featureType ?? ""),
    secondBestScore: matches[1]?.score ?? 0,
  };
}

/**
 * buildPlan.md §43: JD requirement vectors are embedded once per match run
 * (by the caller) and reused across every student — this only does the
 * (cheap, no-LLM-cost) vector search per requirement, once per student.
 */
export async function retrieveEvidenceForStudent(
  studentId: string,
  requirementVectors: { key: string; vector: number[] }[],
  provider: VectorStoreProvider = getProvider(),
): Promise<RetrievalMap> {
  const map: RetrievalMap = new Map();
  const results = await Promise.all(
    requirementVectors.map(async ({ key, vector }) => {
      const evidence = await retrieveBestStudentEvidence(studentId, vector, provider);
      return { key, evidence };
    }),
  );
  for (const { key, evidence } of results) {
    if (evidence) map.set(key, evidence);
  }
  return map;
}
