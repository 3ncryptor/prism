"use client";

import { useRef, useState } from "react";
import { NSAlert, NSButton, NSPill, NSTypography } from "@newtonschool/grauity";
import type { Resume } from "@/lib/schemas/resume";
import { resumeStatusColor, resumeStatusLabel } from "@/app/student/resumeStatusDisplay";
import { MUTED_TEXT_COLOR } from "@/app/student/theme";

const ACCEPTED_EXTENSIONS = ".pdf,.docx";

interface ResumeStatusCardProps {
  resume: Resume | null;
  onUploaded: () => void;
}

export function ResumeStatusCard({ resume, onUploaded }: ResumeStatusCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/resumes", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Upload failed. Please try again.");
      }
      onUploaded();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

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
        <NSTypography variant="paragraph-md-p2" color={MUTED_TEXT_COLOR}>
          {resume.originalName}
        </NSTypography>
      ) : (
        <NSTypography variant="paragraph-md-p2" color={MUTED_TEXT_COLOR}>
          No resume uploaded yet. Upload a PDF or DOCX to get started.
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

      {uploadError && <NSAlert variant="error" icon={null} description={uploadError} />}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="sr-only"
        onChange={handleFileSelected}
      />
      <div>
        <NSButton
          variant="secondary"
          loading={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {resume ? "Upload a new resume" : "Upload resume"}
        </NSButton>
      </div>
    </div>
  );
}
