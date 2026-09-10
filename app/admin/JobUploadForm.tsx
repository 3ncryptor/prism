"use client";

import { useEffect, useRef, useState } from "react";
import type { JobRoleTaxonomyEntry } from "@/lib/schemas/jobRoleTaxonomy";
import { Input } from "@/lib/ui/Input";
import { Select } from "@/lib/ui/Select";
import { Button } from "@/lib/ui/Button";

const ACCEPTED_EXTENSIONS = ".pdf,.docx";

interface JobUploadFormProps {
  onUploaded: () => void;
}

/** docs/screens.md §8.8 (feature 27o): migrated off Grauity onto lib/ui. */
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
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-sm text-gray-700">
          Job title
          <Input name="title" placeholder="e.g. Backend Engineer" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-sm text-gray-700">
          Company (optional)
          <Input name="company" placeholder="e.g. Acme Corp" value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm text-gray-700">
          Job role
          <Select name="jobRole" value={jobRole} onChange={(e) => setJobRole(e.target.value)}>
            <option value="">Select a role…</option>
            {roles.map((role) => (
              <option key={role._id} value={role.canonicalName}>
                {role.displayName}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} className="sr-only" id="jd-file-input" />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          Choose JD file
        </Button>
        <Button type="submit" disabled={isUploading}>
          {isUploading ? "Uploading…" : "Upload job description"}
        </Button>
      </div>

      {uploadError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {uploadError}
        </p>
      )}
    </form>
  );
}
