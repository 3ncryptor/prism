import type { StudentProfile } from "@/lib/schemas/studentProfile";
import type { JobProfile } from "@/lib/schemas/jobProfile";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import type { MatchEvaluation, RetrievalMap } from "@/lib/matching/types";
import { evaluateEligibility } from "@/lib/matching/eligibilityEngine";
import { matchSkills } from "@/lib/matching/skillMatcher";
import { matchExperience } from "@/lib/matching/experienceMatcher";
import { matchProjects } from "@/lib/matching/projectMatcher";
import { matchEducation } from "@/lib/matching/educationMatcher";
import { matchOtherRequirements } from "@/lib/matching/requirementMatcher";
import { scoreHardRequirements, aggregateScore } from "@/lib/matching/scoreAggregator";
import { applyMandatoryPenalty } from "@/lib/matching/penaltyEngine";
import { bucketScore } from "@/lib/matching/bucketEngine";
import { computeConfidence } from "@/lib/matching/confidenceEngine";

/**
 * buildPlan.md §22/§62/§63, orchestrated per BACKEND_ARCHITECTURE.md §6.
 * Synchronous and I/O-free: `retrieval` is pre-fetched by the caller
 * (MatchingService), not looked up here — buildPlan.md §63 sketches
 * `evaluate` as Promise-returning in anticipation of inline retrieval
 * calls, but BACKEND_ARCHITECTURE.md §2 is explicit that lib/matching/*
 * does no I/O at all; where the two conflict, the more detailed doc wins
 * (AGENTS.md §118 precedence), so this is a plain function, not async.
 */
export function evaluateMatch(
  student: StudentProfile,
  job: JobProfile,
  config: ScoringConfig,
  retrieval: RetrievalMap,
): MatchEvaluation {
  const eligibility = evaluateEligibility(student, job);

  const hardRequirementResult = scoreHardRequirements(student, job);
  const skillResult = matchSkills([...job.requiredSkills, ...job.preferredSkills], student.skills, retrieval, config);
  const experienceResult = matchExperience(job.requiredExperience, student.experience);
  const projectResult = matchProjects(job, retrieval, config);
  const educationResult = matchEducation(job.educationRequirements, student.education);
  const otherResult = matchOtherRequirements(student, job, retrieval, config);

  const categoryScores = {
    hardRequirements: hardRequirementResult.categoryScore,
    skills: skillResult.categoryScore,
    experience: experienceResult.categoryScore,
    projects: projectResult.categoryScore,
    education: educationResult.categoryScore,
    other: otherResult.categoryScore,
  };

  let score = aggregateScore(categoryScores, config);
  score = applyMandatoryPenalty(score, skillResult.mandatoryMissedCount, skillResult.mandatoryTotal, config.mandatoryPenalty);
  score = Math.max(0, Math.min(100, score));

  const evidence = [
    ...hardRequirementResult.evidence,
    ...skillResult.evidence,
    ...experienceResult.evidence,
    ...projectResult.evidence,
    ...educationResult.evidence,
    ...otherResult.evidence,
  ];

  const confidence = computeConfidence({ studentProfile: student, evidence, retrieval });

  return {
    score,
    confidence,
    bucket: bucketScore(score, config),
    eligible: eligibility.eligible,
    ineligibilityReasons: eligibility.reasons,
    categoryScores,
    evidence,
    missingRequirements: skillResult.missingRequirements,
  };
}
