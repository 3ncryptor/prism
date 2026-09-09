"use client";

import { useEffect, useState } from "react";
import { NSButton, NSTypography } from "@newtonschool/grauity";
import type { Resume } from "@/lib/schemas/resume";
import type { StudentProfile } from "@/lib/schemas/studentProfile";
import { ResumeStatusCard } from "@/app/student/ResumeStatusCard";
import { ProfileSummary } from "@/app/student/ProfileSummary";
import { isTerminalStatus } from "@/app/student/resumeStatusDisplay";
import { MUTED_TEXT_COLOR } from "@/app/student/theme";

const POLL_INTERVAL_MS = 4000;

interface ProfileResponse {
  profile: StudentProfile | null;
  resume: Resume | null;
}

interface StudentDashboardProps {
  studentName: string;
  studentEmail: string;
  initialProfile: StudentProfile | null;
  initialResume: Resume | null;
  onSignOut: () => void;
}

export function StudentDashboard({
  studentName,
  studentEmail,
  initialProfile,
  initialResume,
  onSignOut,
}: StudentDashboardProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [resume, setResume] = useState(initialResume);

  useEffect(() => {
    if (!resume || isTerminalStatus(resume.status)) return;

    const intervalId = setInterval(async () => {
      const response = await fetch("/api/profile");
      if (!response.ok) return;
      const data: ProfileResponse = await response.json();
      setProfile(data.profile);
      setResume(data.resume);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [resume]);

  async function refreshProfile() {
    const response = await fetch("/api/profile");
    if (!response.ok) return;
    const data: ProfileResponse = await response.json();
    setProfile(data.profile);
    setResume(data.resume);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
        <header className="flex items-center justify-between gap-4">
          <div>
            <NSTypography variant="heading-sb-h2" as="h1">
              {studentName}
            </NSTypography>
            <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
              {studentEmail}
            </NSTypography>
          </div>
          <form action={onSignOut}>
            <NSButton variant="tertiary" type="submit">
              Sign out
            </NSButton>
          </form>
        </header>

        <ResumeStatusCard resume={resume} onUploaded={refreshProfile} />

        {profile ? (
          <ProfileSummary profile={profile} />
        ) : (
          resume?.status !== "READY" && (
            <NSTypography variant="paragraph-md-p2" color={MUTED_TEXT_COLOR}>
              Your extracted profile will appear here once your resume finishes processing.
            </NSTypography>
          )
        )}
      </div>
    </div>
  );
}
