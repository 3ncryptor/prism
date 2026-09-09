"use client";

import { useEffect, useState } from "react";
import { NSTypography } from "@newtonschool/grauity";
import type { Resume } from "@/lib/schemas/resume";
import type { StudentProfile } from "@/lib/schemas/studentProfile";
import { ResumeStatusCard } from "@/app/student/ResumeStatusCard";
import { ProfileSummary } from "@/app/student/ProfileSummary";
import { isTerminalStatus } from "@/app/student/resumeStatusDisplay";
import { MUTED_TEXT_COLOR } from "@/app/student/theme";
import { PageHeader } from "@/lib/layout/PageHeader";

const POLL_INTERVAL_MS = 4000;

interface ProfileResponse {
  profile: StudentProfile | null;
  resume: Resume | null;
}

interface StudentDashboardProps {
  initialProfile: StudentProfile | null;
  initialResume: Resume | null;
}

export function StudentDashboard({ initialProfile, initialResume }: StudentDashboardProps) {
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
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Dashboard" />

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
  );
}
