import { PRIORITY_LABEL } from "@/lib/tasks";
import type { Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const DOT: Record<Priority, string> = {
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}
    >
      <span className={cn("size-1.5 rounded-full", DOT[priority])} aria-hidden />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
