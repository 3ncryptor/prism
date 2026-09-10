"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND_COLOR } from "@/lib/designTokens";
import { Input } from "@/lib/ui/Input";
import { Button } from "@/lib/ui/Button";

/** docs/screens.md §4.3 (feature 27g, motion/visual pass in 27k): centered card inside AuthLayout's shell. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
      setMessage(body.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-900">Forgot password</h1>
      <p className="text-sm text-gray-600">
        Enter your account email and we&apos;ll send you a link to reset your password.
      </p>

      {message ? (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Email
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <Link href="/sign-in" className="text-sm font-medium" style={{ color: BRAND_COLOR }}>
        Back to sign in
      </Link>
    </div>
  );
}
