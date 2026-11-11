import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { taskFormSchema } from "@/lib/schema";
import { addTask, updateTask } from "@/lib/store";
import type { Priority, Task } from "@/lib/types";
import { FieldError } from "./field-error";

type Errors = Partial<Record<"title" | "description" | "dueDate", string>>;

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this task. */
  task?: Task | null;
  defaults?: Partial<{ title: string; dueDate: string }>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? defaults?.title ?? "");
    setDescription(task?.description ?? "");
    setDueDate(task?.dueDate ?? defaults?.dueDate ?? "");
    setPriority(task?.priority ?? "medium");
    setErrors({});
  }, [open, task, defaults?.title, defaults?.dueDate]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = taskFormSchema.safeParse({ title, description, dueDate, priority });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    const input = {
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate || null,
      priority: parsed.data.priority,
    };
    const ok = task ? updateTask(task.id, input) : Boolean(addTask(input));
    if (ok) {
      toast.success(task ? "Task updated" : "Task created");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
            <DialogDescription>
              {task ? "Update the details of this task." : "Add something you need to get done."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              autoFocus
              maxLength={200}
              placeholder="e.g. Send the quarterly report"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "task-title-error" : undefined}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((p) => ({ ...p, title: undefined }));
              }}
            />
            <FieldError id="task-title-error" message={errors.title} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-description">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="task-description"
              value={description}
              rows={3}
              maxLength={5000}
              placeholder="Add any details"
              aria-invalid={Boolean(errors.description)}
              onChange={(e) => setDescription(e.target.value)}
            />
            <FieldError id="task-description-error" message={errors.description} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="task-due">
                Due date <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  aria-invalid={Boolean(errors.dueDate)}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (errors.dueDate) setErrors((p) => ({ ...p, dueDate: undefined }));
                  }}
                />
                {dueDate && (
                  <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => setDueDate("")}>
                    Clear
                  </Button>
                )}
              </div>
              <FieldError id="task-due-error" message={errors.dueDate} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger id="task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={title.trim().length === 0}>
              {task ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
