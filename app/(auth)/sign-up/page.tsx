"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND_COLOR } from "@/lib/designTokens";
import { Input } from "@/lib/ui/Input";
import { Button } from "@/lib/ui/Button";

/** docs/screens.md §7.1 (feature 28, motion/visual pass in feature 27k): centered card inside AuthLayout's shell. */
export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSignInInstead, setShowSignInInstead] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setShowSignInInstead(false);

    if (password !== confirmPassword) {
      setError("Password and confirmation don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (typeof body.error === "string" && body.error.includes("already exists")) {
          setShowSignInInstead(true);
        }
        throw new Error(body.error ?? "Something went wrong.");
      }
      setMessage(body.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-900">Create an account</h1>

      {message ? (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div role="alert" className="flex flex-col gap-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <p>{error}</p>
              {showSignInInstead && (
                <Link href="/sign-in" className="font-medium underline">
                  Sign in instead
                </Link>
              )}
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Name
            <Input type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Email
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Password
            <Input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Confirm password
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
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
      )}

      <p className="text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium" style={{ color: BRAND_COLOR }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
