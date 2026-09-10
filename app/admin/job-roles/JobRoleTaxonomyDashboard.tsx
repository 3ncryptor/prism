"use client";

import { useState } from "react";
import type { JobRoleTaxonomyEntry } from "@/lib/schemas/jobRoleTaxonomy";
import { BRAND_COLOR, BRAND_TINT_COLOR, MUTED_TEXT_COLOR } from "@/lib/designTokens";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";
import { Typography } from "@/lib/ui/Typography";
import { Input } from "@/lib/ui/Input";
import { Button } from "@/lib/ui/Button";
import { Badge } from "@/lib/ui/Badge";

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
 * docs/screens.md §4.11 (feature 27e), visual pass in §8.9 (feature 27o):
 * "deliberately near-identical in structure to the existing Skill
 * Taxonomy admin page" — same master-detail layout (§6.4, feature 27a2),
 * minus category/aliases since job roles are a flat list, not a
 * categorized taxonomy. Migrated off Grauity onto lib/ui.
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

      <div className="flex flex-wrap gap-6">
        <Card className="flex w-64 shrink-0 flex-col gap-1 p-3">
          <div className="max-h-[28rem] overflow-y-auto">
            {roles.length === 0 ? (
              <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>
                No job roles yet.
              </Typography>
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
                    <Typography
                      variant="body"
                      as="span"
                      style={{ color: isSelected ? BRAND_COLOR : entry.isActive ? undefined : MUTED_TEXT_COLOR }}
                      className={isSelected ? "font-semibold" : undefined}
                    >
                      <span style={!entry.isActive ? { textDecoration: "line-through" } : undefined}>
                        {entry.displayName}
                      </span>
                    </Typography>
                  </button>
                );
              })
            )}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setForm(EMPTY_FORM)}>
            + Add role
          </Button>
        </Card>

        <Card as="form" onSubmit={handleSubmit} className="flex min-w-[280px] flex-1 flex-col gap-3 bg-gray-50">
          <Typography variant="h3">{form.editingId ? "Edit job role" : "Add a job role"}</Typography>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1 text-sm text-gray-700">
              Canonical name
              <Input
                name="canonicalName"
                placeholder="e.g. data science"
                value={form.canonicalName}
                disabled={Boolean(form.editingId)}
                onChange={(e) => setForm((f) => ({ ...f, canonicalName: e.target.value }))}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-gray-700">
              Display name
              <Input
                name="displayName"
                placeholder="e.g. Data Science"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </label>
          </div>

          {selectedEntry && (
            <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>
              Usage: {selectedEntry.usageCount} reference{selectedEntry.usageCount === 1 ? "" : "s"}
            </Typography>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : form.editingId ? "Save changes" : "Add role"}
            </Button>
            {selectedEntry?.isActive && (
              <Button type="button" variant="outline" onClick={() => handleDeactivate(selectedEntry._id)}>
                Deactivate
              </Button>
            )}
            {form.editingId && (
              <Button type="button" variant="ghost" onClick={() => setForm(EMPTY_FORM)}>
                Cancel
              </Button>
            )}
          </div>

          {selectedEntry && <Badge tone={selectedEntry.isActive ? "success" : "error"}>{selectedEntry.isActive ? "Active" : "Inactive"}</Badge>}

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
