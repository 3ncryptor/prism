"use client";

import { useEffect, useState } from "react";
import { NSAlert, NSButton, NSTextField, NSTypography } from "@newtonschool/grauity";
import type { User } from "@/lib/schemas/user";
import { MUTED_TEXT_COLOR } from "@/lib/grauityTheme";
import { PageHeader } from "@/lib/layout/PageHeader";
import { Card } from "@/lib/layout/Card";

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

/** docs/screens.md §4.8 (feature 27f). */
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
          <NSTypography variant="heading-sb-h4" as="h2">
            Account
          </NSTypography>
          <NSTextField
            name="name"
            label="Name"
            value={fields.name}
            onChange={(e) => setField("name", e.target.value)}
          />
          <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
            Email: {user.email} (read-only)
          </NSTypography>
          {!isChangingPassword ? (
            <NSButton type="button" variant="tertiary" onClick={() => setIsChangingPassword(true)}>
              Change password
            </NSButton>
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
              <NSTextField
                name="currentPassword"
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <NSTextField
                name="newPassword"
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <NSTextField
                name="confirmPassword"
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {passwordError && <NSAlert variant="error" icon={null} description={passwordError} />}
              <div className="flex gap-3">
                <NSButton type="button" variant="primary" loading={isSavingPassword} onClick={handleChangePassword}>
                  Save new password
                </NSButton>
                <NSButton type="button" variant="tertiary" onClick={() => setIsChangingPassword(false)}>
                  Cancel
                </NSButton>
              </div>
            </div>
          )}
          {passwordSuccess && <NSAlert variant="success" icon={null} description="Password updated." />}
        </Card>

        <Card className="flex flex-col gap-3">
          <NSTypography variant="heading-sb-h4" as="h2">
            Academic
          </NSTypography>
          <NSTextField
            name="rollNumber"
            label="Roll number"
            value={fields.rollNumber}
            onChange={(e) => setField("rollNumber", e.target.value)}
          />
          <NSTextField
            name="branch"
            label="Branch"
            value={fields.branch}
            onChange={(e) => setField("branch", e.target.value)}
          />
          <NSTextField
            name="batchYear"
            label="Batch year"
            value={fields.batchYear}
            onChange={(e) => setField("batchYear", e.target.value)}
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <NSTypography variant="heading-sb-h4" as="h2">
            Contact &amp; links
          </NSTypography>
          <NSTextField
            name="phone"
            label="Phone"
            value={fields.phone}
            onChange={(e) => setField("phone", e.target.value)}
          />
          <NSTextField
            name="linkedinUrl"
            label="LinkedIn"
            value={fields.linkedinUrl}
            onChange={(e) => setField("linkedinUrl", e.target.value)}
          />
          <NSTextField
            name="githubUrl"
            label="GitHub"
            value={fields.githubUrl}
            onChange={(e) => setField("githubUrl", e.target.value)}
          />
          <NSTextField
            name="portfolioUrl"
            label="Portfolio"
            value={fields.portfolioUrl}
            onChange={(e) => setField("portfolioUrl", e.target.value)}
          />

          <div className="flex items-center gap-3 pt-2">
            <NSButton type="submit" variant="primary" loading={isSaving}>
              Save changes
            </NSButton>
            {saveSuccess && (
              <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                Saved.
              </NSTypography>
            )}
          </div>
          {saveError && <NSAlert variant="error" icon={null} description={saveError} />}
        </Card>
      </form>
    </div>
  );
}
