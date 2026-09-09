/**
 * Prism - Evaluation Harness (buildPlan.md §78)
 *
 * Runs the deterministic matching engine against the fixtures in
 * tests/evaluation/ and reports bucket/skill-match accuracy. See
 * tests/evaluation/README.md for why these are synthetic smoke-test
 * fixtures, not a real accuracy measurement.
 *
 * Run with: npm run evaluate
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { studentProfileSchema, type StudentProfile } from "@/lib/schemas/studentProfile";
import { jobProfileSchema, type JobProfile } from "@/lib/schemas/jobProfile";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import { SCORING_V1_DEFAULTS } from "@/lib/config/matchingDefaults";
import { evaluateMatch } from "@/lib/matching/matchingEngine";
import type { FitBucket } from "@/lib/matching/types";

const FIXTURES_DIR = path.join(process.cwd(), "tests", "evaluation");

interface Label {
  resumeFile: string;
  jobFile: string;
  expectedBucket: FitBucket;
  expectedSkills: string[];
}

const DATE_FIELDS: Record<string, string[]> = {
  student: ["createdAt", "updatedAt", "extractionMetadata.extractedAt"],
  job: ["createdAt", "updatedAt"],
};

function reviveDates(raw: Record<string, unknown>, paths: string[]): Record<string, unknown> {
  const revived = structuredClone(raw);
  for (const fieldPath of paths) {
    const segments = fieldPath.split(".");
    let target = revived as Record<string, unknown>;
    for (let i = 0; i < segments.length - 1; i++) {
      target = target[segments[i]] as Record<string, unknown>;
    }
    const lastSegment = segments[segments.length - 1];
    target[lastSegment] = new Date(target[lastSegment] as string);
  }
  return revived;
}

function loadFixtures<T>(dir: string, dateFieldPaths: string[], parse: (input: unknown) => T): Map<string, T> {
  const fixtures = new Map<string, T>();
  for (const filename of readdirSync(dir)) {
    if (!filename.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(path.join(dir, filename), "utf-8"));
    fixtures.set(filename, parse(reviveDates(raw, dateFieldPaths)));
  }
  return fixtures;
}

function buildScoringConfig(): ScoringConfig {
  return {
    _id: "eval-scoring-config",
    isActive: false,
    createdBy: "eval-harness",
    createdAt: new Date(),
    ...SCORING_V1_DEFAULTS,
  };
}

interface PairResult {
  label: Label;
  predictedBucket: FitBucket;
  matchedSkills: string[];
  bucketCorrect: boolean;
}

function evaluatePair(
  label: Label,
  students: Map<string, StudentProfile>,
  jobs: Map<string, JobProfile>,
  config: ScoringConfig,
): PairResult {
  const student = students.get(label.resumeFile);
  const job = jobs.get(label.jobFile);
  if (!student) throw new Error(`Missing resume fixture: ${label.resumeFile}`);
  if (!job) throw new Error(`Missing job fixture: ${label.jobFile}`);

  const result = evaluateMatch(student, job, config, new Map());
  const matchedSkills = result.evidence
    .filter((e) => e.category === "SKILL" && e.score > 0)
    .map((e) => e.requirement);

  return {
    label,
    predictedBucket: result.bucket,
    matchedSkills,
    bucketCorrect: result.bucket === label.expectedBucket,
  };
}

function computeSkillRecall(results: PairResult[]): number | null {
  let matched = 0;
  let expected = 0;
  for (const { label, matchedSkills } of results) {
    if (label.expectedSkills.length === 0) continue;
    expected += label.expectedSkills.length;
    matched += label.expectedSkills.filter((skill) => matchedSkills.includes(skill)).length;
  }
  return expected > 0 ? matched / expected : null;
}

function main() {
  const students = loadFixtures(path.join(FIXTURES_DIR, "resumes"), DATE_FIELDS.student, (raw) =>
    studentProfileSchema.parse(raw),
  );
  const jobs = loadFixtures(path.join(FIXTURES_DIR, "jobs"), DATE_FIELDS.job, (raw) => jobProfileSchema.parse(raw));
  const labels: Label[] = JSON.parse(readFileSync(path.join(FIXTURES_DIR, "labels", "labels.json"), "utf-8"));

  const config = buildScoringConfig();
  const results = labels.map((label) => evaluatePair(label, students, jobs, config));

  const bucketAccuracy = results.filter((r) => r.bucketCorrect).length / results.length;
  const skillRecall = computeSkillRecall(results);

  console.log("\nPer-pair results:");
  for (const r of results) {
    const status = r.bucketCorrect ? "PASS" : "FAIL";
    console.log(
      `  [${status}] ${r.label.resumeFile} vs ${r.label.jobFile}: predicted=${r.predictedBucket} expected=${r.label.expectedBucket}`,
    );
  }

  console.log("\nEvaluation summary (synthetic fixtures — see tests/evaluation/README.md):");
  console.log(`  Bucket accuracy:      ${(bucketAccuracy * 100).toFixed(1)}%`);
  console.log(`  Skill match recall:   ${skillRecall === null ? "N/A (no expected skills)" : `${(skillRecall * 100).toFixed(1)}%`}`);
  console.log(`  Extraction F1:        N/A — requires real extracted resumes/JDs`);
  console.log(`  NDCG@20:              N/A — requires a real ranked candidate pool`);

  if (bucketAccuracy < 1) {
    console.error("\nOne or more fixture pairs did not match their expected bucket — matching engine regression?");
    process.exitCode = 1;
  }
}

main();
