"use client";

import { useEffect, useState } from "react";
import type { User } from "@/lib/schemas/user";
import { MUTED_TEXT_COLOR } from "@/lib/designTokens";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";
import { Typography } from "@/lib/ui/Typography";
import { Input } from "@/lib/ui/Input";
import { Button } from "@/lib/ui/Button";

type SafeUser = Omit<User, "passwordHash">;

const EMPTY_FIELDS = {
  name: "",
  rollNumber: "",
  branch: "",
  batchYear: "",
  phone: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {label}
      {children}
    </label>
  );
}

/** docs/screens.md §4.8 (feature 27f), visual pass in §8.6 (feature 27m): migrated off Grauity onto lib/ui. */
export function ProfilePageContent() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data: { user: SafeUser | null }) => {
        if (cancelled || !data.user) return;
        setUser(data.user);
        setFields({
          name: data.user.name ?? "",
          rollNumber: data.user.rollNumber ?? "",
          branch: data.user.branch ?? "",
          batchYear: data.user.batchYear?.toString() ?? "",
          phone: data.user.phone ?? "",
          linkedinUrl: data.user.linkedinUrl ?? "",
          githubUrl: data.user.githubUrl ?? "",
          portfolioUrl: data.user.portfolioUrl ?? "",
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setField(key: keyof typeof EMPTY_FIELDS, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name,
          rollNumber: fields.rollNumber,
          branch: fields.branch,
          batchYear: fields.batchYear ? Number(fields.batchYear) : undefined,
          phone: fields.phone,
          linkedinUrl: fields.linkedinUrl,
          githubUrl: fields.githubUrl,
          portfolioUrl: fields.portfolioUrl,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save changes.");
      setUser(body.user);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }
    setIsSavingPassword(true);
    try {
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to change password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
      setIsChangingPassword(false);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (!user) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="Profile" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Profile" />

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-3">
          <Typography variant="h3">Account</Typography>
          <Field label="Name">
            <Input name="name" value={fields.name} onChange={(e) => setField("name", e.target.value)} />
          </Field>
          <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>
            Email: {user.email} (read-only)
          </Typography>
          {!isChangingPassword ? (
            <Button type="button" variant="ghost" className="self-start" onClick={() => setIsChangingPassword(true)}>
              Change password
            </Button>
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
              <Field label="Current password">
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </Field>
              <Field label="New password">
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </Field>
              <Field label="Confirm new password">
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Field>
              {passwordError && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {passwordError}
                </p>
              )}
              <div className="flex gap-3">
                <Button type="button" disabled={isSavingPassword} onClick={handleChangePassword}>
                  {isSavingPassword ? "Saving…" : "Save new password"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsChangingPassword(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {passwordSuccess && (
            <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              Password updated.
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <Typography variant="h3">Academic</Typography>
          <Field label="Roll number">
            <Input name="rollNumber" value={fields.rollNumber} onChange={(e) => setField("rollNumber", e.target.value)} />
          </Field>
          <Field label="Branch">
            <Input name="branch" value={fields.branch} onChange={(e) => setField("branch", e.target.value)} />
          </Field>
          <Field label="Batch year">
            <Input name="batchYear" value={fields.batchYear} onChange={(e) => setField("batchYear", e.target.value)} />
          </Field>
        </Card>

        <Card className="flex flex-col gap-3">
          <Typography variant="h3">Contact &amp; links</Typography>
          <Field label="Phone">
            <Input name="phone" value={fields.phone} onChange={(e) => setField("phone", e.target.value)} />
          </Field>
          <Field label="LinkedIn">
            <Input name="linkedinUrl" value={fields.linkedinUrl} onChange={(e) => setField("linkedinUrl", e.target.value)} />
          </Field>
          <Field label="GitHub">
            <Input name="githubUrl" value={fields.githubUrl} onChange={(e) => setField("githubUrl", e.target.value)} />
          </Field>
          <Field label="Portfolio">
            <Input name="portfolioUrl" value={fields.portfolioUrl} onChange={(e) => setField("portfolioUrl", e.target.value)} />
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
            {saveSuccess && <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>Saved.</Typography>}
          </div>
          {saveError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError}
            </p>
          )}
        </Card>
      </form>
    </div>
  );
}
