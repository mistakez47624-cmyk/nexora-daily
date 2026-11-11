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
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WEEKDAY_SHORT } from "@/lib/routines";
import { routineFormSchema } from "@/lib/schema";
import { addRoutine, updateRoutine } from "@/lib/store";
import type { Routine } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FieldError } from "./field-error";

const PRESETS: { label: string; days: number[] }[] = [
  { label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Weekends", days: [0, 6] },
];

// Monday-first display order
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type Errors = Partial<Record<"name" | "description" | "days", string>>;

export function RoutineFormDialog({
  open,
  onOpenChange,
  routine,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine?: Routine | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<number[]>(PRESETS[0].days);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    setName(routine?.name ?? "");
    setDescription(routine?.description ?? "");
    setDays(routine?.days ?? PRESETS[0].days);
    setErrors({});
  }, [open, routine]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = routineFormSchema.safeParse({ name, description, days });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Errors] ??= issue.message;
      setErrors(next);
      return;
    }
    const ok = routine ? updateRoutine(routine.id, parsed.data) : Boolean(addRoutine(parsed.data));
    if (ok) {
      toast.success(routine ? "Routine updated" : "Routine created");
      onOpenChange(false);
    }
  };

  const sortedKey = [...days].sort().join();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{routine ? "Edit routine" : "New routine"}</DialogTitle>
            <DialogDescription>Build a habit by repeating it on a schedule.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="routine-name">Name</Label>
            <Input
              id="routine-name"
              value={name}
              autoFocus
              maxLength={80}
              placeholder="e.g. Morning walk"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "routine-name-error" : undefined}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
            />
            <FieldError id="routine-name-error" message={errors.name} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="routine-description">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="routine-description"
              value={description}
              rows={2}
              maxLength={500}
              placeholder="Why it matters, or how you'll do it"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label id="routine-days-label">Repeats on</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    sortedKey === p.days.join() && "border-primary bg-selected text-selected-foreground hover:bg-selected hover:text-selected-foreground",
                  )}
                  aria-pressed={sortedKey === p.days.join()}
                  onClick={() => {
                    setDays(p.days);
                    setErrors((e) => ({ ...e, days: undefined }));
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <ToggleGroup
              type="multiple"
              value={days.map(String)}
              onValueChange={(v) => {
                setDays(v.map(Number));
                if (v.length) setErrors((e) => ({ ...e, days: undefined }));
              }}
              aria-labelledby="routine-days-label"
              className="grid grid-cols-7 gap-1"
            >
              {DAY_ORDER.map((d) => (
                <ToggleGroupItem
                  key={d}
                  value={String(d)}
                  className="h-9 border text-xs data-[state=on]:border-primary"
                  aria-label={WEEKDAY_SHORT[d]}
                >
                  {WEEKDAY_SHORT[d].slice(0, 2)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldError id="routine-days-error" message={errors.days} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={name.trim().length === 0 || days.length === 0}>
              {routine ? "Save changes" : "Create routine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
