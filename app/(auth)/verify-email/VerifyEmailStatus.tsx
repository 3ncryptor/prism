"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BRAND_COLOR } from "@/lib/designTokens";
import { Input } from "@/lib/ui/Input";
import { Button } from "@/lib/ui/Button";

type Status = "verifying" | "success" | "invalid";

interface VerifyEmailStatusProps {
  token: string | null;
}

/** docs/screens.md §7.2 (feature 28, motion/visual pass in 27k). */
export function VerifyEmailStatus({ token }: VerifyEmailStatusProps) {
  const [status, setStatus] = useState<Status>(token ? "verifying" : "invalid");
  const [resendEmail, setResendEmail] = useState("");
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [showResendForm, setShowResendForm] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((response) => {
        if (cancelled) return;
        setStatus(response.ok ? "success" : "invalid");
      })
      .catch(() => {
        if (!cancelled) setStatus("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleResend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResendMessage(null);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      const body = await response.json();
      setResendMessage(body.message ?? "If that account needs verifying, we've sent a new link.");
    } catch {
      setResendMessage("Something went wrong. Try again.");
    }
  }

  if (status === "verifying") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Verifying your email…</h1>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Email verified</h1>
        <p role="status" className="text-sm text-gray-600">
          Your account is ready. Sign in to continue.
        </p>
        <Link
          href="/sign-in"
          style={{ backgroundColor: BRAND_COLOR }}
          className="rounded-md px-4 py-2 text-center font-medium text-white transition-opacity hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-900">Link invalid</h1>
      <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        This link is invalid or has expired.
      </p>

      {!showResendForm ? (
        <Button type="button" onClick={() => setShowResendForm(true)}>
          Request a new link
        </Button>
      ) : resendMessage ? (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {resendMessage}
        </p>
      ) : (
        <form onSubmit={handleResend} className="flex flex-col gap-2">
          <Input
            type="email"
            required
            placeholder="Your email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
          />
          <Button type="submit">Send new link</Button>
        </form>
      )}
    </div>
  );
}
