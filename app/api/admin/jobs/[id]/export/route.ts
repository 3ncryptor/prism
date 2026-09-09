import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { matchRunRepository } from "@/lib/db/repositories/matchRunRepository";
import { matchResultRepository } from "@/lib/db/repositories/matchResultRepository";
import { userRepository } from "@/lib/db/repositories/userRepository";
import { resultsToCsv, type ExportableMatchResult } from "@/lib/services/csvExportService";

/** buildPlan.md §89: CSV export of the exact scored-summary columns, no evidence/prompt text. */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/jobs/[id]/export">) {
  try {
    await requireRole("ADMIN");
    const { id } = await ctx.params;
    const url = new URL(request.url);
    const requestedRunId = url.searchParams.get("runId");

    let runId = requestedRunId;
    if (!runId) {
      const runs = await matchRunRepository.listByJob(id);
      if (runs.length === 0) {
        return NextResponse.json({ error: "No match runs found for this job" }, { status: 404 });
      }
      runId = runs[0]._id;
    }

    const run = await matchRunRepository.get(runId);
    if (!run || run.jobId !== id) {
      return NextResponse.json({ error: "Match run not found for this job" }, { status: 404 });
    }

    const results = await matchResultRepository.listByRun(runId, { includeIneligible: true });
    const students = await userRepository.findByIds(results.map((r) => r.studentId));
    const studentById = new Map(students.map((s) => [s._id, s]));

    const exportable: ExportableMatchResult[] = results.map((result) => ({
      ...result,
      studentName: studentById.get(result.studentId)?.name ?? "Unknown student",
    }));

    const csv = resultsToCsv(exportable);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="match-results-${id}.csv"`,
      },
    });
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
