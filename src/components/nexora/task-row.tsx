import { CalendarDays, Mail, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDue } from "@/lib/dates";
import { setTaskCompleted } from "@/lib/store";
import { isOverdue } from "@/lib/tasks";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "./priority-badge";

function toggleTaskWithFeedback(task: Task) {
  const next = !task.completed;
  if (setTaskCompleted(task.id, next)) {
    toast.success(next ? "Task completed" : "Task marked as not done", {
      action: { label: "Undo", onClick: () => setTaskCompleted(task.id, !next) },
    });
  }
}

export function TaskRow({
  task,
  onEdit,
  onDelete,
  onEmail,
  compact = false,
}: {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onEmail?: (task: Task) => void;
  compact?: boolean;
}) {
  const overdue = isOverdue(task);
  const checkboxId = `task-${task.id}`;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg px-3 transition-colors duration-150 hover:bg-accent/50",
        compact ? "py-2" : "py-3",
      )}
    >
      <Checkbox
        id={checkboxId}
        checked={task.completed}
        onCheckedChange={() => toggleTaskWithFeedback(task)}
        className="mt-0.5"
        aria-label={
          task.completed ? `Mark "${task.title}" as not done` : `Complete "${task.title}"`
        }
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={checkboxId}
          className={cn(
            "block cursor-pointer break-words text-sm font-medium",
            task.completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </label>
        {!compact && task.description && (
          <p className="mt-0.5 line-clamp-2 break-words text-sm text-muted-foreground">
            {task.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <PriorityBadge priority={task.priority} />
          {task.dueDate && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs",
                overdue ? "font-medium text-destructive" : "text-muted-foreground",
              )}
            >
              <CalendarDays className="size-3" strokeWidth={1.75} />
              {overdue ? `Overdue · ${formatDue(task.dueDate)}` : formatDue(task.dueDate)}
            </span>
          )}
        </div>
      </div>
      {(onEdit || onDelete || onEmail) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label={`Actions for "${task.title}"`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onSelect={() => onEdit(task)}>
                <Pencil /> Edit
              </DropdownMenuItem>
            )}
            {onEmail && (
              <DropdownMenuItem onSelect={() => onEmail(task)}>
                <Mail /> Send by email
              </DropdownMenuItem>
            )}
            {(onEdit || onEmail) && onDelete && <DropdownMenuSeparator />}
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onDelete(task)}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
