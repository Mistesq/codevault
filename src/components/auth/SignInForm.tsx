"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInSchema } from "@/lib/validations/auth";

// lucide-react dropped brand icons, so render the GitHub mark inline.
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.63 8.2 11.19.6.11.82-.25.82-.57v-2.01c-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.33-1.73-1.33-1.73-1.09-.72.08-.71.08-.71 1.2.08 1.84 1.21 1.84 1.21 1.07 1.79 2.81 1.27 3.49.97.11-.76.42-1.27.76-1.56-2.67-.3-5.47-1.3-5.47-5.79 0-1.28.47-2.32 1.24-3.14-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.2a11.6 11.6 0 0 1 3-.39c1.02 0 2.05.13 3 .39 2.29-1.52 3.3-1.2 3.3-1.2.66 1.66.24 2.88.12 3.18.77.82 1.24 1.86 1.24 3.14 0 4.5-2.81 5.48-5.49 5.78.43.36.81 1.08.81 2.18v3.23c0 .32.21.69.82.57A12.01 12.01 0 0 0 24 12.29C24 5.78 18.63.5 12 .5Z" />
    </svg>
  );
}

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
  const justRegistered = searchParams.get("registered") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"credentials" | "github" | null>(null);

  // After registration the user is redirected here with `?registered=true`;
  // greet them with a toast (guarded so it fires once, not on every render).
  const toastShown = useRef(false);
  useEffect(() => {
    if (justRegistered && !toastShown.current) {
      toastShown.current = true;
      toast.success("Account created — you can now sign in.");
    }
  }, [justRegistered]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid credentials.");
      return;
    }

    setPending("credentials");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(null);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(toInternalPath(callbackUrl));
    router.refresh();
  }

  function handleGitHub() {
    setPending("github");
    signIn("github", { callbackUrl: callbackUrl ?? "/dashboard" });
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
          <Label htmlFor="password">Password</Label>
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
