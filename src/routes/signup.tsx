import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/nexora/auth-screen";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — NEXORA" }] }),
  component: () => <AuthScreen mode="signup" />,
});
