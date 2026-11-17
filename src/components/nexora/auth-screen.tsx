import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, LockKeyhole, Mail, Sparkles } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "./wordmark";

export type AuthScreenMode = "login" | "signup" | "forgot" | "reset";

const COPY: Record<AuthScreenMode, { title: string; subtitle: string; button: string }> = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to pick up where you left off.",
    button: "Sign in",
  },
  signup: {
    title: "Create your account",
    subtitle: "A calmer place for everything on your mind.",
    button: "Create account",
  },
  forgot: {
    title: "Reset your password",
    subtitle: "We’ll email you a secure link to choose a new password.",
    button: "Send reset link",
  },
  reset: {
    title: "Choose a new password",
    subtitle: "Make it strong and easy for you to remember.",
    button: "Save new password",
  },
};

export function AuthScreen({ mode }: { mode: AuthScreenMode }) {
  const auth = useAuth();
  const copy = COPY[mode];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!supabaseConfigured) {
      setError(
        "Cloud authentication is not configured yet. Add the Supabase project settings to this deployment first.",
      );
      return;
    }
    if (
      (mode === "login" || mode === "signup" || mode === "forgot") &&
      !/^\S+@\S+\.\S+$/.test(email)
    ) {
      setError("Enter a valid email address.");
      return;
    }
    if ((mode === "login" || mode === "signup" || mode === "reset") && password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (mode === "reset" && password !== confirmation) {
      setError("Those passwords don’t match.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        await auth.signIn(email.trim(), password);
      } else if (mode === "signup") {
        const result = await auth.signUp(email.trim(), password);
        setMessage(
          result.needsEmailVerification
            ? "Check your inbox to verify your email, then sign in."
            : "Your account is ready. Opening NEXORA…",
        );
      } else if (mode === "forgot") {
        await auth.requestPasswordReset(email.trim());
        setMessage("If an account exists for that address, a password reset link is on its way.");
      } else {
        await auth.updatePassword(password);
        setMessage("Password updated. You can continue using NEXORA.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-32 size-[26rem] rounded-full bg-violet-600/20 blur-[110px]" />
        <div className="absolute -bottom-40 -right-24 size-[30rem] rounded-full bg-indigo-500/15 blur-[120px]" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <Link
          to="/"
          className="mb-8 inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark />
        </Link>
        <Card className="border-white/10 bg-card/90 p-6 shadow-overlay backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
            {mode === "forgot" || mode === "reset" ? (
              <LockKeyhole className="size-5" />
            ) : (
              <Sparkles className="size-5" />
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy.subtitle}</p>

          {!supabaseConfigured && (
            <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              Supabase project settings are required before account access can be enabled.
            </div>
          )}
          {message && (
            <p
              role="status"
              className="mt-5 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success"
            >
              {message}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <form onSubmit={submit} noValidate className="mt-6 grid gap-4">
            {(mode === "login" || mode === "signup" || mode === "forgot") && (
              <div className="grid gap-2">
                <Label htmlFor="auth-email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            )}
            {(mode === "login" || mode === "signup" || mode === "reset") && (
              <div className="grid gap-2">
                <Label htmlFor="auth-password">
                  {mode === "reset" ? "New password" : "Password"}
                </Label>
                <Input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
            )}
            {mode === "reset" && (
              <div className="grid gap-2">
                <Label htmlFor="auth-confirm-password">Confirm password</Label>
                <Input
                  id="auth-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </div>
            )}
            <Button type="submit" disabled={busy} className="mt-1 w-full">
              {busy ? "Please wait…" : copy.button}
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            {mode === "login" && (
              <>
                <Link to="/forgot-password" className="hover:text-foreground">
                  Forgot password?
                </Link>
                <span>
                  New to NEXORA?{" "}
                  <Link to="/signup" className="font-medium text-primary hover:underline">
                    Create account
                  </Link>
                </span>
              </>
            )}
            {mode === "signup" && (
              <span>
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </span>
            )}
            {mode === "forgot" && (
              <Link to="/login" className="inline-flex items-center gap-1 hover:text-foreground">
                <ArrowLeft className="size-4" /> Back to sign in
              </Link>
            )}
            {mode === "reset" && (
              <Link to="/login" className="inline-flex items-center gap-1 hover:text-foreground">
                <ArrowLeft className="size-4" /> Back to sign in
              </Link>
            )}
          </div>
        </Card>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Your tasks, notes, and routines stay yours.
        </p>
      </div>
    </main>
  );
}
