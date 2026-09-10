import Link from "next/link";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";
import { StatCard } from "@/lib/layout/StatCard";
import { Badge } from "@/lib/ui/Badge";
import { Typography } from "@/lib/ui/Typography";
import { BRAND_COLOR, MUTED_TEXT_COLOR, getRoleColor } from "@/lib/designTokens";
import type { StudentDashboardData } from "@/lib/services/studentDashboardService";

const BUCKET_LABELS = { BEST_FIT: "Best Fit", MODERATE_FIT: "Moderate Fit", LOW_FIT: "Low Fit" } as const;
const BUCKET_COLORS = { BEST_FIT: "#16a34a", MODERATE_FIT: "#d97706", LOW_FIT: "#dc2626" } as const;

interface StudentDashboardProps {
  data: StudentDashboardData;
}

/**
 * docs/screens.md §8.5 (feature 27l). Replaces the old single-arbitrary-
 * resume card with real aggregations from getStudentDashboardData — no
 * Grauity, no client-only ssr:false wrapper needed (see app/student/page.tsx).
 */
export function StudentDashboard({ data }: StudentDashboardProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Dashboard" />

      <Card className="flex flex-col gap-3">
        <Typography variant="h2">
          Published for {data.publishedRoleCount} of {data.totalRoleCount} roles
        </Typography>
        {data.roleCoverage.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.roleCoverage.map((role) => {
              const color = getRoleColor(role.canonicalName);
              return role.isPublished ? (
                <Badge
                  key={role.canonicalName}
                  tone="neutral"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  {role.displayName}
                </Badge>
              ) : (
                <Link key={role.canonicalName} href={`/student/resumes?role=${encodeURIComponent(role.canonicalName)}`}>
                  <Badge
                    tone="neutral"
                    className="border bg-white"
                    style={{ borderColor: color.border, color: color.text }}
                  >
                    {role.displayName}
                  </Badge>
                </Link>
              );
            })}
          </div>
        ) : (
          <Typography variant="body" style={{ color: MUTED_TEXT_COLOR }}>
            No job roles have been set up yet.
          </Typography>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(Object.keys(BUCKET_LABELS) as Array<keyof typeof BUCKET_LABELS>).map((bucket) => (
          <StatCard
            key={bucket}
            label={BUCKET_LABELS[bucket]}
            value={data.bucketCounts[bucket]}
            valueColor={BUCKET_COLORS[bucket]}
          />
        ))}
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Typography variant="h2">Recent results</Typography>
          <Link href="/student/applications" className="text-sm font-medium" style={{ color: BRAND_COLOR }}>
            View all →
          </Link>
        </div>
        {data.recentResults.length > 0 ? (
          <div className="flex flex-col gap-2">
            {data.recentResults.map((result) => (
              <div
                key={result.jobId}
                className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="flex flex-col">
                  <Typography variant="body" as="span" className="font-medium">
                    {result.title}
                  </Typography>
                  {result.company && (
                    <Typography variant="caption">{result.company}</Typography>
                  )}
                </div>
                <Badge tone="neutral" style={{ color: BUCKET_COLORS[result.bucket] }}>
                  {BUCKET_LABELS[result.bucket]}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <Typography variant="body" style={{ color: MUTED_TEXT_COLOR }}>
            No results published yet. Check back once a placement cell publishes results for a job you&apos;re matched against.
          </Typography>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Typography variant="h2">Profile {data.profileCompletionPercent}% complete</Typography>
          <Link href="/student/profile" className="text-sm font-medium" style={{ color: BRAND_COLOR }}>
            Complete your profile →
          </Link>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${data.profileCompletionPercent}%`, backgroundColor: BRAND_COLOR }}
          />
        </div>
      </Card>

      {data.skills.length > 0 && (
        <Card className="flex flex-col gap-3">
          <Typography variant="h2">Skills</Typography>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill) => {
              const color = getRoleColor(skill.category);
              return (
                <Badge
                  key={skill.canonicalName}
                  tone="neutral"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  {skill.name}
                </Badge>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
