import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/nexora/auth-screen";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — NEXORA" }] }),
  component: () => <AuthScreen mode="login" />,
});
