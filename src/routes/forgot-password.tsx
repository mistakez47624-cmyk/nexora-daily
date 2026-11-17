import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/nexora/auth-screen";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Password recovery — NEXORA" }] }),
  component: () => <AuthScreen mode="forgot" />,
});
