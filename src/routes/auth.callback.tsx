import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Verifying email — NEXORA" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (status === "signed-in") void navigate({ to: "/" });
    if (status === "signed-out" || status === "unconfigured") setFailed(true);
  }, [status, navigate]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold">
          {failed ? "We couldn’t verify that link" : "Verifying your email"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {failed
            ? "The link may have expired, or Supabase isn’t configured for this app. Return to sign in and request a new link."
            : "Your secure session is being prepared."}
        </p>
        {failed && supabaseConfigured && (
          <a className="mt-4 inline-block text-sm text-primary underline" href="/login">
            Back to sign in
          </a>
        )}
      </Card>
    </main>
  );
}
