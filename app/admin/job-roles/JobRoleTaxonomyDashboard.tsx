"use client";

import { useState } from "react";
import { NSAlert, NSButton, NSPill, NSTextField, NSTypography } from "@newtonschool/grauity";
import type { JobRoleTaxonomyEntry } from "@/lib/schemas/jobRoleTaxonomy";
import { BRAND_COLOR, BRAND_TINT_COLOR, MUTED_TEXT_COLOR } from "@/lib/grauityTheme";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";

type EntryWithUsage = JobRoleTaxonomyEntry & { usageCount: number };

interface JobRoleTaxonomyDashboardProps {
  initialRoles: EntryWithUsage[];
}

interface FormState {
  editingId: string | null;
  canonicalName: string;
  displayName: string;
}

const EMPTY_FORM: FormState = { editingId: null, canonicalName: "", displayName: "" };

/**
 * docs/screens.md §4.11 (feature 27e): "deliberately near-identical in
 * structure to the existing Skill Taxonomy admin page" — same master-
 * detail layout (§6.4, feature 27a2), minus category/aliases since job
 * roles are a flat list, not a categorized taxonomy.
 */
export function JobRoleTaxonomyDashboard({ initialRoles }: JobRoleTaxonomyDashboardProps) {
  const [roles, setRoles] = useState(initialRoles);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshRoles() {
    const response = await fetch("/api/admin/job-roles");
    if (!response.ok) return;
    const data: { roles: EntryWithUsage[] } = await response.json();
    setRoles(data.roles);
  }

  function startEdit(entry: EntryWithUsage) {
    setError(null);
    setForm({ editingId: entry._id, canonicalName: entry.canonicalName, displayName: entry.displayName });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const response = form.editingId
        ? await fetch(`/api/admin/job-roles/${form.editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName: form.displayName }),
          })
        : await fetch("/api/admin/job-roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ canonicalName: form.canonicalName, displayName: form.displayName }),
          });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save job role.");

      setForm(EMPTY_FORM);
      await refreshRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save job role.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/admin/job-roles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to deactivate job role.");
      }
      if (form.editingId === id) setForm(EMPTY_FORM);
      await refreshRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate job role.");
    }
  }

  const selectedEntry = roles.find((r) => r._id === form.editingId) ?? null;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Job Roles" />

      <div className="flex gap-6">
        <Card className="flex w-64 shrink-0 flex-col gap-1 p-3">
          <div className="max-h-[28rem] overflow-y-auto">
            {roles.length === 0 ? (
              <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                No job roles yet.
              </NSTypography>
            ) : (
              roles.map((entry) => {
                const isSelected = entry._id === form.editingId;
                return (
                  <button
                    key={entry._id}
                    type="button"
                    onClick={() => startEdit(entry)}
                    className="w-full rounded-md px-3 py-2 text-left transition-colors duration-150 ease-out"
                    style={isSelected ? { backgroundColor: BRAND_TINT_COLOR } : undefined}
                  >
                    <NSTypography
                      variant="paragraph-sb-p3"
                      as="span"
                      color={isSelected ? BRAND_COLOR : entry.isActive ? undefined : MUTED_TEXT_COLOR}
                    >
                      <span style={!entry.isActive ? { textDecoration: "line-through" } : undefined}>
                        {entry.displayName}
                      </span>
                    </NSTypography>
                  </button>
                );
              })
            )}
          </div>
          <NSButton type="button" variant="tertiary" size="small" onClick={() => setForm(EMPTY_FORM)}>
            + Add role
          </NSButton>
        </Card>

        <Card as="form" onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3 bg-gray-50">
          <NSTypography variant="heading-sb-h4" as="h2">
            {form.editingId ? "Edit job role" : "Add a job role"}
          </NSTypography>
          <div className="flex flex-col gap-3 sm:flex-row">
            <NSTextField
              name="canonicalName"
              label="Canonical name"
              placeholder="e.g. data science"
              value={form.canonicalName}
              isDisabled={Boolean(form.editingId)}
              onChange={(e) => setForm((f) => ({ ...f, canonicalName: e.target.value }))}
            />
            <NSTextField
              name="displayName"
              label="Display name"
              placeholder="e.g. Data Science"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </div>

          {selectedEntry && (
            <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
              Usage: {selectedEntry.usageCount} reference{selectedEntry.usageCount === 1 ? "" : "s"}
            </NSTypography>
          )}

          <div className="flex items-center gap-3">
            <NSButton type="submit" variant="primary" loading={isSaving}>
              {form.editingId ? "Save changes" : "Add role"}
            </NSButton>
            {selectedEntry?.isActive && (
              <NSButton type="button" variant="tertiary" onClick={() => handleDeactivate(selectedEntry._id)}>
                Deactivate
              </NSButton>
            )}
            {form.editingId && (
              <NSButton type="button" variant="tertiary" onClick={() => setForm(EMPTY_FORM)}>
                Cancel
              </NSButton>
            )}
          </div>

          {selectedEntry && (
            <NSPill color={selectedEntry.isActive ? "success" : "error"} isActive>
              {selectedEntry.isActive ? "Active" : "Inactive"}
            </NSPill>
          )}

          {error && <NSAlert variant="error" icon={null} description={error} />}
        </Card>
      </div>
    </div>
  );
}
