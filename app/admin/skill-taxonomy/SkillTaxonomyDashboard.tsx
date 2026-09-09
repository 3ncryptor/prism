"use client";

import { useState } from "react";
import { NSAlert, NSButton, NSPill, NSTextField, NSTypography } from "@newtonschool/grauity";
import type { SkillTaxonomyEntry } from "@/lib/schemas/skillTaxonomy";
import { BRAND_COLOR, BRAND_TINT_COLOR, MUTED_TEXT_COLOR } from "@/lib/grauityTheme";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";

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

/**
 * docs/screens.md §6.4 (feature 27a2): retrofitted from a top-form-then-
 * flat-table layout to a two-pane master-detail — a scrollable skills list
 * on the left, the create/edit form for whichever skill is selected (or a
 * blank "Add skill" form) on the right. Same create/edit/deactivate/
 * usage-count logic as before; layout only.
 */
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
    setError(null);
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
      if (form.editingId === id) setForm(EMPTY_FORM);
      await refreshSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate skill.");
    }
  }

  const selectedEntry = skills.find((s) => s._id === form.editingId) ?? null;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Skill Taxonomy" />

      <div className="flex gap-6">
        <Card className="flex w-64 shrink-0 flex-col gap-1 p-3">
          <div className="max-h-[28rem] overflow-y-auto">
            {skills.length === 0 ? (
              <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                No skills yet.
              </NSTypography>
            ) : (
              skills.map((entry) => {
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
                        {entry.canonicalName}
                      </span>
                    </NSTypography>
                  </button>
                );
              })
            )}
          </div>
          <NSButton type="button" variant="tertiary" size="small" onClick={() => setForm(EMPTY_FORM)}>
            + Add skill
          </NSButton>
        </Card>

        <Card as="form" onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3 bg-gray-50">
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

          {selectedEntry && (
            <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
              Usage: {selectedEntry.usageCount} reference{selectedEntry.usageCount === 1 ? "" : "s"}
            </NSTypography>
          )}

          <div className="flex items-center gap-3">
            <NSButton type="submit" variant="primary" loading={isSaving}>
              {form.editingId ? "Save changes" : "Add skill"}
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
