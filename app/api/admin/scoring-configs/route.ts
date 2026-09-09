import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import {
  listScoringConfigVersions,
  createScoringConfigVersion,
  InvalidWeightsError,
  DuplicateVersionError,
} from "@/lib/services/scoringConfigService";

/** buildPlan.md §113.3 — feature #22c. */
export async function GET() {
  try {
    await requireRole("ADMIN");
    const versions = await listScoringConfigVersions();
    return NextResponse.json({ versions });
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

export async function POST(request: Request) {
  try {
    const session = await requireRole("ADMIN");
    const body = await request.json().catch(() => ({}));

    const version = typeof body.version === "string" ? body.version.trim() : "";
    if (!version || typeof body.weights !== "object" || typeof body.buckets !== "object" ||
        typeof body.semanticThresholds !== "object" || typeof body.mandatoryPenalty !== "number") {
      return NextResponse.json({ error: "version, weights, buckets, semanticThresholds, and mandatoryPenalty are required" }, { status: 400 });
    }

    const config = await createScoringConfigVersion({
      version,
      weights: body.weights,
      buckets: body.buckets,
      semanticThresholds: body.semanticThresholds,
      mandatoryPenalty: body.mandatoryPenalty,
      createdBy: session.user.id,
    });
    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof InvalidWeightsError || error instanceof DuplicateVersionError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof DuplicateVersionError ? 409 : 400 });
    }
    throw error;
  }
}
