"use client";

import { useState } from "react";
import type { SkillTaxonomyEntry } from "@/lib/schemas/skillTaxonomy";
import { BRAND_COLOR, BRAND_TINT_COLOR, MUTED_TEXT_COLOR } from "@/lib/designTokens";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";
import { Typography } from "@/lib/ui/Typography";
import { Input } from "@/lib/ui/Input";
import { Select } from "@/lib/ui/Select";
import { Button } from "@/lib/ui/Button";
import { Badge } from "@/lib/ui/Badge";

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
 * docs/screens.md §6.4 (feature 27a2), visual pass in §8.9 (feature 27o):
 * two-pane master-detail, migrated off Grauity onto lib/ui. The master
 * list gets a visible custom scrollbar (app/globals.css's .custom-scroll)
 * plus a bottom fade-out cue — the live audit found 1830px of content in
 * a 448px box with zero scroll affordance.
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

      <div className="flex flex-wrap gap-6">
        <Card className="relative flex w-64 shrink-0 flex-col gap-1 p-3">
          <div className="custom-scroll max-h-[28rem] overflow-y-auto">
            {skills.length === 0 ? (
              <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>
                No skills yet.
              </Typography>
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
                    <Typography
                      variant="body"
                      as="span"
                      style={{ color: isSelected ? BRAND_COLOR : entry.isActive ? undefined : MUTED_TEXT_COLOR }}
                      className={isSelected ? "font-semibold" : undefined}
                    >
                      <span style={!entry.isActive ? { textDecoration: "line-through" } : undefined}>
                        {entry.canonicalName}
                      </span>
                    </Typography>
                  </button>
                );
              })
            )}
          </div>
          {skills.length > 0 && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-3 bottom-12 h-8 bg-gradient-to-t from-white to-transparent"
            />
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setForm(EMPTY_FORM)}>
            + Add skill
          </Button>
        </Card>

        <Card as="form" onSubmit={handleSubmit} className="flex min-w-[280px] flex-1 flex-col gap-3 bg-gray-50">
          <Typography variant="h3">{form.editingId ? "Edit skill" : "Add a skill"}</Typography>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1 text-sm text-gray-700">
              Canonical name
              <Input
                name="canonicalName"
                placeholder="e.g. node.js"
                value={form.canonicalName}
                disabled={Boolean(form.editingId)}
                onChange={(e) => setForm((f) => ({ ...f, canonicalName: e.target.value }))}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-gray-700">
              Display name
              <Input
                name="displayName"
                placeholder="e.g. Node.js"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-sm text-gray-700">
              Category
              <Select
                name="category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as SkillTaxonomyEntry["category"] }))}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-gray-700">
              Aliases (comma-separated)
              <Input
                name="aliases"
                placeholder="e.g. nodejs, node"
                value={form.aliases}
                onChange={(e) => setForm((f) => ({ ...f, aliases: e.target.value }))}
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
              {isSaving ? "Saving…" : form.editingId ? "Save changes" : "Add skill"}
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
