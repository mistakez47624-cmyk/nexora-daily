import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CornerDownLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { captureSchema } from "@/lib/schema";
import { addInboxItem } from "@/lib/store";
import type { InboxCategory } from "@/lib/types";
import { FieldError } from "./field-error";

export const CATEGORY_LABEL: Record<InboxCategory, string> = {
  task: "Task",
  note: "Note",
  idea: "Idea",
};

export function QuickCapture({
  showViewAction = false,
  autoFocus = false,
}: {
  showViewAction?: boolean;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [category, setCategory] = useState<InboxCategory>("task");
  const [error, setError] = useState<string>();
  const navigate = useNavigate();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = captureSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    if (addInboxItem(parsed.data, category)) {
      setValue("");
      setError(undefined);
      toast.success(`${CATEGORY_LABEL[category]} captured to Inbox`, {
        action: showViewAction
          ? { label: "View", onClick: () => navigate({ to: "/inbox" }) }
          : undefined,
      });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(undefined);
            }}
            autoFocus={autoFocus}
            maxLength={1000}
            placeholder="Capture a task, note or idea…"
            aria-label="Quick capture"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "capture-error" : undefined}
            className="h-10 pr-10"
          />
          <CornerDownLeft
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        </div>
        <div className="flex gap-2">
          <ToggleGroup
            type="single"
            value={category}
            onValueChange={(v) => v && setCategory(v as InboxCategory)}
            className="h-10 flex-1 rounded-md border bg-card p-1 sm:flex-none"
            aria-label="Capture type"
          >
            {(Object.keys(CATEGORY_LABEL) as InboxCategory[]).map((c) => (
              <ToggleGroupItem key={c} value={c} size="sm" className="h-8 flex-1 px-3 text-xs">
                {CATEGORY_LABEL[c]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button type="submit" className="h-10" disabled={value.trim().length === 0}>
            Capture
          </Button>
        </div>
      </div>
      <FieldError id="capture-error" message={error} />
    </form>
  );
}
