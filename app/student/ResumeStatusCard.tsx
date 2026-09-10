import Link from "next/link";
import { NSAlert, NSPill, NSTypography } from "@newtonschool/grauity";
import type { Resume } from "@/lib/schemas/resume";
import { resumeStatusColor, resumeStatusLabel } from "@/app/student/resumeStatusDisplay";
import { MUTED_TEXT_COLOR } from "@/app/student/theme";
import { BRAND_COLOR } from "@/lib/grauityTheme";

interface ResumeStatusCardProps {
  resume: Resume | null;
}

/**
 * docs/screens.md §4.5 (feature 27d): a lighter summary of the currently
 * published resume — uploading and managing multiple resumes moved to
 * /student/resumes (§4.6), so this card is read-only plus a link there.
 */
export function ResumeStatusCard({ resume }: ResumeStatusCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-6">
      <div className="flex items-center justify-between gap-4">
        <NSTypography variant="heading-sb-h4" as="h2">
          Resume
        </NSTypography>
        {resume && (
          <NSPill color={resumeStatusColor(resume.status)} isActive>
            {resumeStatusLabel(resume.status)}
          </NSPill>
        )}
      </div>

      {resume ? (
        <>
          <NSTypography variant="paragraph-sb-p3">{resume.label}</NSTypography>
          <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
            {resume.originalName} · Published for matching
          </NSTypography>
        </>
      ) : (
        <NSTypography variant="paragraph-md-p2" color={MUTED_TEXT_COLOR}>
          No resume published yet. Upload one to get started.
        </NSTypography>
      )}

      {resume?.status === "FAILED" && (
        <NSAlert
          variant="error"
          icon={null}
          title="Processing failed"
          description={resume.error?.message ?? "We couldn't process this resume. Please try uploading it again."}
        />
      )}

      <Link href="/student/resumes" className="text-sm font-medium" style={{ color: BRAND_COLOR }}>
        Manage resumes →
      </Link>
    </div>
  );
}
