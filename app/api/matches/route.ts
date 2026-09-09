import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { matchResultRepository } from "@/lib/db/repositories/matchResultRepository";
import { jobRepository } from "@/lib/db/repositories/jobRepository";
import type { MatchEvidenceDoc, MatchResult } from "@/lib/schemas/matchResult";

interface PublishedApplication {
  jobId: string;
  title: string;
  company?: string;
  status: "published";
  score: number;
  confidence: number;
  bucket: MatchResult["bucket"];
  missingRequirements: string[];
  evidence: MatchEvidenceDoc[];
}

interface UnderReviewApplication {
  jobId: string;
  title: string;
  company?: string;
  status: "under_review";
}

type Application = PublishedApplication | UnderReviewApplication;

/**
 * buildPlan.md §113.2/§86, BACKEND_ARCHITECTURE.md §0.6: a job the student
 * has any result for always appears — as "under_review" until the admin
 * publishes the *specific* run the student's result belongs to. Never
 * shows a result from an unpublished run, even if it's the student's most
 * recent one.
 */
export async function GET() {
  try {
    const session = await requireRole("STUDENT");
    const allResults = await matchResultRepository.listByStudent(session.user.id);

    const resultsByJob = new Map<string, MatchResult[]>();
    for (const result of allResults) {
      const existing = resultsByJob.get(result.jobId) ?? [];
      resultsByJob.set(result.jobId, [...existing, result]);
    }

    const applications: Application[] = [];
    for (const [jobId, results] of resultsByJob) {
      const job = await jobRepository.get(jobId);
      if (!job) continue;

      const published = job.publishedMatchRunId
        ? results.find((r) => r.matchRunId === job.publishedMatchRunId)
        : undefined;

      if (published) {
        applications.push({
          jobId,
          title: job.title,
          company: job.company,
          status: "published",
          score: published.score,
          confidence: published.confidence,
          bucket: published.bucket,
          missingRequirements: published.missingRequirements,
          evidence: published.evidence,
        });
      } else {
        applications.push({ jobId, title: job.title, company: job.company, status: "under_review" });
      }
    }

    return NextResponse.json({ applications });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
