"use client";

import { useState } from "react";
import { NSAlert, NSButton, NSPill, NSTextField, NSTypography } from "@newtonschool/grauity";
import type { SkillTaxonomyEntry } from "@/lib/schemas/skillTaxonomy";
import { MUTED_TEXT_COLOR } from "@/lib/grauityTheme";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";
import { EmptyState } from "@/lib/layout/EmptyState";

type EntryWithUsage = SkillTaxonomyEntry & { usageCount: number };

const CATEGORIES: SkillTaxonomyEntry["category"][] = [
  "LANGUAGE",
  "FRAMEWORK",
  "DATABASE",
  "CLOUD",
  "TOOL",
  "LIBRARY",
  "CONCEPT",
  "OTHER",
];

interface SkillTaxonomyDashboardProps {
  initialSkills: EntryWithUsage[];
}

interface FormState {
  editingId: string | null;
  canonicalName: string;
  displayName: string;
  category: SkillTaxonomyEntry["category"];
  aliases: string;
}

const EMPTY_FORM: FormState = { editingId: null, canonicalName: "", displayName: "", category: "LANGUAGE", aliases: "" };

export function SkillTaxonomyDashboard({ initialSkills }: SkillTaxonomyDashboardProps) {
  const [skills, setSkills] = useState(initialSkills);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshSkills() {
    const response = await fetch("/api/admin/skill-taxonomy");
    if (!response.ok) return;
    const data: { skills: EntryWithUsage[] } = await response.json();
    setSkills(data.skills);
  }

  function startEdit(entry: EntryWithUsage) {
    setForm({
      editingId: entry._id,
      canonicalName: entry.canonicalName,
      displayName: entry.displayName,
      category: entry.category,
      aliases: entry.aliases.join(", "),
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const aliases = form.aliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      const response = form.editingId
        ? await fetch(`/api/admin/skill-taxonomy/${form.editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName: form.displayName, category: form.category, aliases }),
          })
        : await fetch("/api/admin/skill-taxonomy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              canonicalName: form.canonicalName,
              displayName: form.displayName,
              category: form.category,
              aliases,
            }),
          });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save skill.");

      setForm(EMPTY_FORM);
      await refreshSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save skill.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/admin/skill-taxonomy/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to deactivate skill.");
      }
      await refreshSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate skill.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Skill Taxonomy" />

      <Card as="form" onSubmit={handleSubmit} className="flex flex-col gap-3 bg-gray-50">
          <NSTypography variant="heading-sb-h4" as="h2">
            {form.editingId ? "Edit skill" : "Add a skill"}
          </NSTypography>
          <div className="flex flex-col gap-3 sm:flex-row">
            <NSTextField
              name="canonicalName"
              label="Canonical name"
              placeholder="e.g. node.js"
              value={form.canonicalName}
              isDisabled={Boolean(form.editingId)}
              onChange={(e) => setForm((f) => ({ ...f, canonicalName: e.target.value }))}
            />
            <NSTextField
              name="displayName"
              label="Display name"
              placeholder="e.g. Node.js"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-sm">
              Category
              <select
                className="rounded border border-gray-300 px-3 py-2"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as SkillTaxonomyEntry["category"] }))}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <NSTextField
              name="aliases"
              label="Aliases (comma-separated)"
              placeholder="e.g. nodejs, node"
              value={form.aliases}
              onChange={(e) => setForm((f) => ({ ...f, aliases: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-3">
            <NSButton type="submit" variant="primary" loading={isSaving}>
              {form.editingId ? "Save changes" : "Add skill"}
            </NSButton>
            {form.editingId && (
              <NSButton type="button" variant="tertiary" onClick={() => setForm(EMPTY_FORM)}>
                Cancel
              </NSButton>
            )}
          </div>
          {error && <NSAlert variant="error" icon={null} description={error} />}
      </Card>

      {skills.length === 0 ? (
        <EmptyState message="No skills in the taxonomy yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {["Name", "Category", "Aliases", "Usage", "Status", ""].map((heading) => (
                  <th key={heading} className="px-4 py-3">
                    <NSTypography variant="paragraph-sb-l1" color={MUTED_TEXT_COLOR}>
                      {heading}
                    </NSTypography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skills.map((entry) => (
                <tr key={entry._id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <NSTypography variant="paragraph-sb-p3">{entry.displayName}</NSTypography>
                    <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>{entry.canonicalName}</NSTypography>
                  </td>
                  <td className="px-4 py-3">
                    <NSTypography variant="paragraph-md-p3">{entry.category}</NSTypography>
                  </td>
                  <td className="px-4 py-3">
                    <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                      {entry.aliases.length > 0 ? entry.aliases.join(", ") : "—"}
                    </NSTypography>
                  </td>
                  <td className="px-4 py-3">
                    <NSTypography variant="paragraph-md-p3">{entry.usageCount}</NSTypography>
                  </td>
                  <td className="px-4 py-3">
                    <NSPill color={entry.isActive ? "success" : "error"} isActive>
                      {entry.isActive ? "Active" : "Inactive"}
                    </NSPill>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <NSButton variant="tertiary" size="small" onClick={() => startEdit(entry)}>
                        Edit
                      </NSButton>
                      {entry.isActive && (
                        <NSButton variant="tertiary" size="small" onClick={() => handleDeactivate(entry._id)}>
                          Deactivate
                        </NSButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
