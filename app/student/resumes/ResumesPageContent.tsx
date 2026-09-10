"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NSAlert, NSButton, NSPill, NSTextField, NSTypography } from "@newtonschool/grauity";
import type { Resume } from "@/lib/schemas/resume";
import type { StudentProfile } from "@/lib/schemas/studentProfile";
import type { JobRoleTaxonomyEntry } from "@/lib/schemas/jobRoleTaxonomy";
import { resumeStatusColor, resumeStatusLabel } from "@/app/student/resumeStatusDisplay";
import { MUTED_TEXT_COLOR } from "@/app/student/theme";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";
import { EmptyState } from "@/lib/layout/EmptyState";
import { ProfileSummary } from "@/app/student/ProfileSummary";

const ACCEPTED_EXTENSIONS = ".pdf,.docx";
const POLL_INTERVAL_MS = 4000;

/**
 * docs/screens.md §4.6 (feature 27d). Upload always adds a new resume;
 * "Published for matching" is the student's own explicit choice — turning
 * one on turns any other off (single-active invariant kept until 27e's
 * role-based routing allows more than one published resume at once, per
 * lib/services/resumeService.ts's setResumePublishStatus).
 */
export function ResumesPageContent() {
  const searchParams = useSearchParams();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [label, setLabel] = useState("");
  // Pre-selects the upload form's role when arriving from a dashboard
  // "coverage gap" badge deep link (docs/screens.md §8.5, feature 27l).
  const [jobRole, setJobRole] = useState(() => searchParams.get("role") ?? "");
  const [roles, setRoles] = useState<JobRoleTaxonomyEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, StudentProfile | null>>({});
  const [loadingProfileId, setLoadingProfileId] = useState<string | null>(null);

  async function refreshResumes() {
    const response = await fetch("/api/resumes");
    if (!response.ok) return;
    const data: { resumes: Resume[] } = await response.json();
    setResumes(data.resumes);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/resumes")
      .then((res) => (res.ok ? res.json() : { resumes: [] }))
      .then((data: { resumes: Resume[] }) => {
        if (!cancelled) {
          setResumes(data.resumes);
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/job-roles")
      .then((res) => (res.ok ? res.json() : { roles: [] }))
      .then((data: { roles: JobRoleTaxonomyEntry[] }) => {
        if (!cancelled) setRoles(data.roles);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const hasProcessing = resumes.some((r) => r.status !== "READY" && r.status !== "FAILED");
    if (!hasProcessing) return;
    const intervalId = setInterval(refreshResumes, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [resumes]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Choose a file to upload.");
      return;
    }
    if (!label.trim()) {
      setUploadError('Give this resume a label, e.g. "Data Science Resume".');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("label", label.trim());
      if (jobRole) formData.set("jobRole", jobRole);
      const response = await fetch("/api/resumes", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Upload failed. Please try again.");
      setLabel("");
      setJobRole("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refreshResumes();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleTogglePublish(resume: Resume) {
    setActionError(null);
    setTogglingId(resume._id);
    try {
      const response = await fetch(`/api/resumes/${resume._id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !resume.isActive }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to update publish status.");
      await refreshResumes();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update publish status.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleToggleProfile(resumeId: string) {
    if (expandedId === resumeId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(resumeId);
    if (profiles[resumeId] !== undefined) return;
    setLoadingProfileId(resumeId);
    try {
      const response = await fetch(`/api/resumes/${resumeId}/profile`);
      const body = await response.json();
      setProfiles((prev) => ({ ...prev, [resumeId]: response.ok ? body.profile : null }));
    } finally {
      setLoadingProfileId(null);
    }
  }

  async function handleViewFile(resumeId: string) {
    setActionError(null);
    try {
      const response = await fetch(`/api/resumes/${resumeId}/file-url`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to open file.");
      window.open(body.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to open file.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Resumes" />

      <Card as="form" onSubmit={handleUpload} className="flex flex-col gap-3 bg-gray-50">
        <NSTypography variant="heading-sb-h4" as="h2">
          Upload a new resume
        </NSTypography>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <NSTextField
            name="label"
            label="Label"
            placeholder='e.g. "Data Science Resume"'
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Job role
            <select
              className="rounded border border-gray-300 px-3 py-2"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
            >
              <option value="">No specific role — general resume</option>
              {roles.map((role) => (
                <option key={role._id} value={role.canonicalName}>
                  {role.displayName}
                </option>
              ))}
            </select>
          </label>
          <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} className="text-sm" />
          <NSButton type="submit" variant="primary" loading={isUploading}>
            Upload resume
          </NSButton>
        </div>
        {uploadError && <NSAlert variant="error" icon={null} description={uploadError} />}
      </Card>

      {actionError && <NSAlert variant="error" icon={null} description={actionError} />}

      {!isLoading && resumes.length === 0 && (
        <EmptyState message="No resumes uploaded yet. Upload one above to get started." />
      )}

      <div className="flex flex-col gap-3">
        {resumes.map((resume) => {
          const isReady = resume.status === "READY";
          const isFailed = resume.status === "FAILED";
          return (
            <Card key={resume._id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <NSTypography variant="paragraph-sb-p2" as="h3">
                  {resume.label}
                </NSTypography>
                <NSPill color={resumeStatusColor(resume.status)} isActive>
                  {resumeStatusLabel(resume.status)}
                </NSPill>
              </div>
              <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                {resume.originalName} · Role:{" "}
                {resume.jobRole
                  ? (roles.find((r) => r.canonicalName === resume.jobRole)?.displayName ?? resume.jobRole)
                  : "General resume"}
              </NSTypography>

              {isFailed && (
                <NSAlert
                  variant="error"
                  icon={null}
                  description={resume.error?.message ?? "We couldn't process this resume."}
                />
              )}

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={resume.isActive}
                    disabled={!isReady || togglingId === resume._id}
                    onChange={() => handleTogglePublish(resume)}
                  />
                  Published for matching
                </label>
                {!isReady && !isFailed && (
                  <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                    (publish toggle disabled until ready)
                  </NSTypography>
                )}
              </div>

              {isReady && (
                <div className="flex gap-3 pt-1">
                  <NSButton variant="tertiary" size="small" onClick={() => handleToggleProfile(resume._id)}>
                    {expandedId === resume._id ? "Hide parsed profile" : "View parsed profile"}
                  </NSButton>
                  <NSButton variant="tertiary" size="small" onClick={() => handleViewFile(resume._id)}>
                    View file
                  </NSButton>
                </div>
              )}

              {expandedId === resume._id && (
                <div className="pt-2">
                  {loadingProfileId === resume._id ? (
                    <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                      Loading…
                    </NSTypography>
                  ) : profiles[resume._id] ? (
                    <ProfileSummary profile={profiles[resume._id] as StudentProfile} />
                  ) : (
                    <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                      No parsed profile available.
                    </NSTypography>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
