"use client";

import { useState } from "react";
import { NSAlert, NSButton, NSPill, NSTextField, NSTypography } from "@newtonschool/grauity";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import { MUTED_TEXT_COLOR } from "@/lib/grauityTheme";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";

interface ScoringConfigDashboardProps {
  initialVersions: ScoringConfig[];
}

type WeightKey = keyof ScoringConfig["weights"];
const WEIGHT_FIELDS: { key: WeightKey; label: string }[] = [
  { key: "hardRequirements", label: "Hard requirements" },
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "projects", label: "Projects" },
  { key: "education", label: "Education" },
  { key: "other", label: "Other" },
];

interface FormState {
  version: string;
  weights: Record<WeightKey, string>;
  bestFit: string;
  moderateFit: string;
  strong: string;
  possible: string;
  mandatoryPenalty: string;
}

function toFormState(source: ScoringConfig): FormState {
  return {
    version: "",
    weights: {
      hardRequirements: String(source.weights.hardRequirements),
      skills: String(source.weights.skills),
      experience: String(source.weights.experience),
      projects: String(source.weights.projects),
      education: String(source.weights.education),
      other: String(source.weights.other),
    },
    bestFit: String(source.buckets.bestFit),
    moderateFit: String(source.buckets.moderateFit),
    strong: String(source.semanticThresholds.strong),
    possible: String(source.semanticThresholds.possible),
    mandatoryPenalty: String(source.mandatoryPenalty),
  };
}

const BLANK_FORM: FormState = {
  version: "",
  weights: { hardRequirements: "", skills: "", experience: "", projects: "", education: "", other: "" },
  bestFit: "",
  moderateFit: "",
  strong: "",
  possible: "",
  mandatoryPenalty: "",
};

export function ScoringConfigDashboard({ initialVersions }: ScoringConfigDashboardProps) {
  const [versions, setVersions] = useState(initialVersions);
  const active = versions.find((v) => v.isActive) ?? null;
  const [form, setForm] = useState<FormState>(active ? toFormState(active) : BLANK_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshVersions() {
    const response = await fetch("/api/admin/scoring-configs");
    if (!response.ok) return;
    const data: { versions: ScoringConfig[] } = await response.json();
    setVersions(data.versions);
  }

  const weightSum = WEIGHT_FIELDS.reduce((sum, { key }) => sum + (parseFloat(form.weights[key]) || 0), 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/scoring-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: form.version,
          weights: {
            hardRequirements: parseFloat(form.weights.hardRequirements),
            skills: parseFloat(form.weights.skills),
            experience: parseFloat(form.weights.experience),
            projects: parseFloat(form.weights.projects),
            education: parseFloat(form.weights.education),
            other: parseFloat(form.weights.other),
          },
          buckets: { bestFit: parseFloat(form.bestFit), moderateFit: parseFloat(form.moderateFit) },
          semanticThresholds: { strong: parseFloat(form.strong), possible: parseFloat(form.possible) },
          mandatoryPenalty: parseFloat(form.mandatoryPenalty),
        }),
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save scoring config.");

      setForm(BLANK_FORM);
      await refreshVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save scoring config.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleActivate(id: string) {
    setError(null);
    setActivatingId(id);
    try {
      const response = await fetch(`/api/admin/scoring-configs/${id}/activate`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to activate scoring config.");
      }
      await refreshVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate scoring config.");
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Scoring Config" />

      {active && (
        <Card className="flex flex-col gap-2 bg-gray-50">
          <div className="flex items-center gap-3">
            <NSTypography variant="heading-sb-h4" as="h2">Active: {active.version}</NSTypography>
            <NSPill color="success" isActive>Active</NSPill>
          </div>
          <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
            Weights: {WEIGHT_FIELDS.map(({ key, label }) => `${label} ${active.weights[key]}`).join(", ")}
          </NSTypography>
          <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
            Buckets: Best Fit ≥ {active.buckets.bestFit}, Moderate Fit ≥ {active.buckets.moderateFit}
          </NSTypography>
          <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
            Semantic thresholds: strong ≥ {active.semanticThresholds.strong}, possible ≥ {active.semanticThresholds.possible}
          </NSTypography>
          <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
            Mandatory penalty: {active.mandatoryPenalty}
          </NSTypography>
        </Card>
      )}

      <Card as="form" onSubmit={handleSubmit} className="flex flex-col gap-3 bg-gray-50">
          <NSTypography variant="heading-sb-h4" as="h2">Create new version</NSTypography>
          <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
            Pre-filled from the active config — adjust values and save as a new version. Existing versions are never edited in place.
          </NSTypography>
          <NSTextField
            name="version"
            label="Version name"
            placeholder="e.g. scoring-v2"
            value={form.version}
            onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {WEIGHT_FIELDS.map(({ key, label }) => (
              <NSTextField
                key={key}
                name={`weight-${key}`}
                label={label}
                value={form.weights[key]}
                onChange={(e) => setForm((f) => ({ ...f, weights: { ...f.weights, [key]: e.target.value } }))}
              />
            ))}
          </div>
          <NSTypography variant="paragraph-md-p3" color={Math.abs(weightSum - 1) > 0.01 ? "var(--color-error)" : MUTED_TEXT_COLOR}>
            Weight sum: {weightSum.toFixed(3)} (must be 1.0 ± 0.01)
          </NSTypography>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NSTextField name="bestFit" label="Best Fit threshold" value={form.bestFit} onChange={(e) => setForm((f) => ({ ...f, bestFit: e.target.value }))} />
            <NSTextField name="moderateFit" label="Moderate Fit threshold" value={form.moderateFit} onChange={(e) => setForm((f) => ({ ...f, moderateFit: e.target.value }))} />
            <NSTextField name="strong" label="Strong semantic threshold" value={form.strong} onChange={(e) => setForm((f) => ({ ...f, strong: e.target.value }))} />
            <NSTextField name="possible" label="Possible semantic threshold" value={form.possible} onChange={(e) => setForm((f) => ({ ...f, possible: e.target.value }))} />
          </div>
          <NSTextField name="mandatoryPenalty" label="Mandatory penalty" value={form.mandatoryPenalty} onChange={(e) => setForm((f) => ({ ...f, mandatoryPenalty: e.target.value }))} />
          <div>
            <NSButton type="submit" variant="primary" loading={isSaving}>Save as new version</NSButton>
          </div>
          {error && <NSAlert variant="error" icon={null} description={error} />}
      </Card>

      <div className="flex flex-col gap-3">
        <NSTypography variant="heading-sb-h4" as="h2">Version history</NSTypography>
        <div className="flex flex-col gap-2">
          {versions.map((version) => (
            <div key={version._id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <NSTypography variant="paragraph-sb-p2" as="span">{version.version}</NSTypography>
                <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                  {new Date(version.createdAt).toLocaleString()}
                </NSTypography>
              </div>
              {version.isActive ? (
                <NSPill color="success" isActive>Active</NSPill>
              ) : (
                <NSButton
                  variant="tertiary"
                  size="small"
                  loading={activatingId === version._id}
                  onClick={() => handleActivate(version._id)}
                >
                  Activate
                </NSButton>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
