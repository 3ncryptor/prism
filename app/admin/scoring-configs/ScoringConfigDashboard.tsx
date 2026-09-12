"use client";

import { useState } from "react";
import type { ScoringConfig } from "@/lib/schemas/scoringConfig";
import { MUTED_TEXT_COLOR } from "@/lib/designTokens";
import { formatTimestamp } from "@/lib/formatTimestamp";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";
import { Typography } from "@/lib/ui/Typography";
import { Input } from "@/lib/ui/Input";
import { Button } from "@/lib/ui/Button";
import { Badge } from "@/lib/ui/Badge";

interface ScoringConfigDashboardProps {
  initialVersions: ScoringConfig[];
}

type WeightKey = keyof ScoringConfig["weights"];
const WEIGHT_FIELDS: { key: WeightKey; label: string; color: string }[] = [
  { key: "hardRequirements", label: "Hard requirements", color: "#4F46E5" },
  { key: "skills", label: "Skills", color: "#0891B2" },
  { key: "experience", label: "Experience", color: "#059669" },
  { key: "projects", label: "Projects", color: "#EA580C" },
  { key: "education", label: "Education", color: "#C026D3" },
  { key: "other", label: "Other", color: "#6B7280" },
];

interface FormState {
  version: string;
  weights: Record<WeightKey, string>;
  bestFit: string;
  moderateFit: string;
  strong: string;
  possible: string;
  weak: string;
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
    weak: String(source.semanticThresholds.weak),
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
  weak: "",
  mandatoryPenalty: "",
};

function WeightDistributionBar({ weights }: { weights: Record<WeightKey, string> }) {
  const total = WEIGHT_FIELDS.reduce((sum, { key }) => sum + Math.max(parseFloat(weights[key]) || 0, 0), 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
        {WEIGHT_FIELDS.map(({ key, color }) => {
          const value = Math.max(parseFloat(weights[key]) || 0, 0);
          const pct = total > 0 ? (value / total) * 100 : 0;
          return <div key={key} style={{ width: `${pct}%`, backgroundColor: color }} />;
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {WEIGHT_FIELDS.map(({ key, label, color }) => (
          <span key={key} className="flex items-center gap-1.5 text-xs" style={{ color: MUTED_TEXT_COLOR }}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * docs/screens.md §8.9 (feature 27o): rebuilt as two-pane (active config
 * summary + version history on the left, create-new-version form on the
 * right) to match Job Roles/Skill Taxonomy's layout, migrated off
 * Grauity. The 6 weight inputs gain a live color-as-data stacked bar
 * (WeightDistributionBar) that updates as the admin types.
 */
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
          semanticThresholds: {
            strong: parseFloat(form.strong),
            possible: parseFloat(form.possible),
            weak: parseFloat(form.weak),
          },
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

      <div className="flex flex-wrap gap-6">
        <Card className="flex min-w-[280px] flex-1 flex-col gap-4">
          {active && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Typography variant="h3">Active: {active.version}</Typography>
                <Badge tone="success">Active</Badge>
              </div>
              <WeightDistributionBar weights={toFormState(active).weights} />
              <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>
                Buckets: Best Fit ≥ {active.buckets.bestFit}, Moderate Fit ≥ {active.buckets.moderateFit}
              </Typography>
              <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>
                Semantic thresholds: strong ≥ {active.semanticThresholds.strong}, possible ≥ {active.semanticThresholds.possible}, weak ≥{" "}
                {active.semanticThresholds.weak}
              </Typography>
              <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>
                Mandatory penalty: {active.mandatoryPenalty}
              </Typography>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Typography variant="h3">Version history</Typography>
            <div className="flex flex-col gap-2">
              {versions.map((version) => (
                <div key={version._id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                  <div>
                    <Typography variant="body" as="span" className="font-semibold">
                      {version.version}
                    </Typography>
                    <Typography variant="caption">{formatTimestamp(version.createdAt)}</Typography>
                  </div>
                  {version.isActive ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activatingId === version._id}
                      onClick={() => handleActivate(version._id)}
                    >
                      {activatingId === version._id ? "Activating…" : "Activate"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card as="form" onSubmit={handleSubmit} className="flex min-w-[320px] flex-1 flex-col gap-3 bg-gray-50">
          <Typography variant="h3">Create new version</Typography>
          <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>
            Pre-filled from the active config — adjust values and save as a new version. Existing versions are never edited in place.
          </Typography>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Version name
            <Input
              name="version"
              placeholder="e.g. scoring-v2"
              value={form.version}
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {WEIGHT_FIELDS.map(({ key, label }) => (
              <label key={key} className="flex flex-col gap-1 text-sm text-gray-700">
                {label}
                <Input
                  name={`weight-${key}`}
                  value={form.weights[key]}
                  onChange={(e) => setForm((f) => ({ ...f, weights: { ...f.weights, [key]: e.target.value } }))}
                />
              </label>
            ))}
          </div>
          <WeightDistributionBar weights={form.weights} />
          <Typography variant="caption" style={{ color: Math.abs(weightSum - 1) > 0.01 ? "#dc2626" : MUTED_TEXT_COLOR }}>
            Weight sum: {weightSum.toFixed(3)} (must be 1.0 ± 0.01)
          </Typography>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Best Fit threshold
              <Input name="bestFit" value={form.bestFit} onChange={(e) => setForm((f) => ({ ...f, bestFit: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Moderate Fit threshold
              <Input name="moderateFit" value={form.moderateFit} onChange={(e) => setForm((f) => ({ ...f, moderateFit: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Strong semantic threshold
              <Input name="strong" value={form.strong} onChange={(e) => setForm((f) => ({ ...f, strong: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Possible semantic threshold
              <Input name="possible" value={form.possible} onChange={(e) => setForm((f) => ({ ...f, possible: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Weak semantic threshold
              <Input name="weak" value={form.weak} onChange={(e) => setForm((f) => ({ ...f, weak: e.target.value }))} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Mandatory penalty
            <Input name="mandatoryPenalty" value={form.mandatoryPenalty} onChange={(e) => setForm((f) => ({ ...f, mandatoryPenalty: e.target.value }))} />
          </label>
          <div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save as new version"}
            </Button>
          </div>
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
