
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const surfaceClass =
  "min-w-0 border border-black/[0.06] bg-white/35 shadow-[0_8px_32px_rgba(31,24,55,0.04)] backdrop-blur-2xl transition-all duration-300 dark:border-white/[0.08] dark:bg-[#191522]/45 dark:shadow-[0_8px_32px_rgba(0,0,0,0.18)]";

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex min-w-0 flex-col overflow-hidden", surfaceClass, className)}>
      <div className="flex min-h-14 items-center justify-between gap-2 border-b border-black/[0.05] bg-white/15 px-5 py-3 dark:border-white/[0.07] dark:bg-white/[0.02]">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="flex-1 p-2">{children}</div>
    </Card>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <Card className={cn("p-5", surfaceClass)}>
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums tracking-tight",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

