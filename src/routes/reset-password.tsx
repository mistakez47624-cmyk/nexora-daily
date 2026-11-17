import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/nexora/auth-screen";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password — NEXORA" }] }),
  component: () => <AuthScreen mode="reset" />,
});
