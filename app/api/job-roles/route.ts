import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { jobRoleTaxonomyRepository } from "@/lib/db/repositories/jobRoleTaxonomyRepository";

/**
 * docs/screens.md §4.6/§4.9 (feature 27e): the read-only list backing both
 * the student resume-upload role picker and the admin JD-upload role
 * picker — any signed-in user, not just admins (unlike the CRUD routes
 * under /api/admin/job-roles, which manage the taxonomy itself).
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const roles = await jobRoleTaxonomyRepository.listActive();
  return NextResponse.json({ roles });
}
