"use client";

import { useEffect, useRef, useState } from "react";
import { NSAlert, NSButton, NSTextField } from "@newtonschool/grauity";
import type { JobRoleTaxonomyEntry } from "@/lib/schemas/jobRoleTaxonomy";

const ACCEPTED_EXTENSIONS = ".pdf,.docx";

interface JobUploadFormProps {
  onUploaded: () => void;
}

export function JobUploadForm({ onUploaded }: JobUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [roles, setRoles] = useState<JobRoleTaxonomyEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !title.trim() || !jobRole) {
      setUploadError("A title, a job role, and a PDF or DOCX file are required.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("title", title.trim());
      formData.set("jobRole", jobRole);
      if (company.trim()) formData.set("company", company.trim());

      const response = await fetch("/api/admin/jobs", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Upload failed. Please try again.");
      }

      setTitle("");
      setCompany("");
      setJobRole("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <NSTextField
          name="title"
          label="Job title"
          placeholder="e.g. Backend Engineer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <NSTextField
          name="company"
          label="Company (optional)"
          placeholder="e.g. Acme Corp"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Job role
          <select
            className="rounded border border-gray-300 px-3 py-2"
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
          >
            <option value="">Select a role…</option>
            {roles.map((role) => (
              <option key={role._id} value={role.canonicalName}>
                {role.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} className="sr-only" id="jd-file-input" />
      <div className="flex items-center gap-3">
        <NSButton
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose JD file
        </NSButton>
        <NSButton type="submit" variant="primary" loading={isUploading}>
          Upload job description
        </NSButton>
      </div>

      {uploadError && <NSAlert variant="error" icon={null} description={uploadError} />}
    </form>
  );
}
