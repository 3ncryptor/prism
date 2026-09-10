"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND_COLOR } from "@/lib/designTokens";
import { Input } from "@/lib/ui/Input";
import { Button } from "@/lib/ui/Button";

interface ResetPasswordFormProps {
  token: string;
}

/** docs/screens.md §4.4 (feature 27g, motion/visual pass in 27k). */
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Reset password</h1>
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Your password has been reset.
        </p>
        <Link href="/sign-in" className="text-sm font-medium" style={{ color: BRAND_COLOR }}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-900">Reset password</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          New password
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Confirm new password
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Resetting…" : "Reset password"}
        </Button>
      </form>
    </div>
  );
}
