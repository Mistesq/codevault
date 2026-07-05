"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitHubIcon } from "@/components/auth/GitHubIcon";
import { signInSchema } from "@/lib/validations/auth";

// Keep redirects on-site: accept a relative path or a same-origin absolute URL,
// otherwise fall back to the dashboard.
function toInternalPath(callbackUrl: string | null): string {
  if (!callbackUrl) return "/dashboard";
  try {
    const url = new URL(callbackUrl, window.location.origin);
    if (url.origin === window.location.origin) return url.pathname + url.search;
  } catch {
    // not a valid URL — fall through
  }
  return callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"credentials" | "github" | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleResend() {
    if (!email) {
      setError("Enter your email above, then resend the verification link.");
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        toast.error(data?.error ?? "Too many attempts. Please try again later.");
        return;
      }

      // The endpoint always responds generically (no enumeration), so we always
      // confirm optimistically.
      toast.success("Verification email sent — check your inbox.");
    } catch {
      toast.error("Couldn't send the email. Please try again.");
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid credentials.");
      return;
    }

    setPending("credentials");
    setShowResend(false);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(null);

    if (result?.error) {
      if (result.code === "email_not_verified") {
        setError("Please verify your email before signing in.");
        setShowResend(true);
      } else if (result.code === "rate_limited") {
        setError("Too many sign-in attempts. Please try again in a few minutes.");
      } else {
        setError("Invalid email or password.");
      }
      return;
    }

    router.push(toInternalPath(callbackUrl));
    router.refresh();
  }

  function handleGitHub() {
    setPending("github");
    // Sanitize the callback the same way the credentials path does, so an
    // off-origin ?callbackUrl can't redirect the user away after OAuth.
    signIn("github", { callbackUrl: toInternalPath(callbackUrl) });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your CodeVault account
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGitHub}
        disabled={pending !== null}
      >
        {pending === "github" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GitHubIcon className="size-4" />
        )}
        Sign in with GitHub
      </Button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {showResend && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resending || pending !== null}
          >
            {resending && <Loader2 className="size-4 animate-spin" />}
            Resend verification email
          </Button>
        )}

        <Button type="submit" className="w-full" disabled={pending !== null}>
          {pending === "credentials" && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
