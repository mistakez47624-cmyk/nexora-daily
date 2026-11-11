import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Check, Flame, MoreHorizontal, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/nexora/confirm-dialog";
import { EmptyState } from "@/components/nexora/empty-state";
import { PageHeader } from "@/components/nexora/page-header";
import { RoutineFormDialog } from "@/components/nexora/routine-form-dialog";
import { fromDateKey, shiftKey, todayKey, toDateKey } from "@/lib/dates";
import {
  bestStreak,
  completionRate,
  currentStreak,
  describeSchedule,
  isCompletedOn,
  isScheduledOn,
  routinesDueOn,
} from "@/lib/routines";
import { deleteRoutine, setRoutineDone, useAppData } from "@/lib/store";
import type { Routine } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/routines")({
  head: () => ({
    meta: [
      { title: "Routines — NEXORA" },
      { name: "description", content: "Build habits with recurring routines, daily check-ins and streaks." },
      { property: "og:title", content: "Routines — NEXORA" },
      { property: "og:description", content: "Build habits with recurring routines, daily check-ins and streaks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoutinesPage,
});

const HISTORY_DAYS = 14;

function RoutinesPage() {
  const { routines } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [deleting, setDeleting] = useState<Routine | null>(null);
  const today = todayKey();

  const dueToday = routinesDueOn(routines, today);
  const doneToday = dueToday.filter((r) => isCompletedOn(r, today)).length;

  // Scheduled-today routines first, then the rest; each group in creation order.
  const ordered = [...routines].sort(
    (a, b) => Number(isScheduledOn(b, today)) - Number(isScheduledOn(a, today)),
  );

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Routines"
        description={
          routines.length === 0
            ? "Build habits by repeating them on a schedule."
            : dueToday.length === 0
              ? "No routines scheduled today."
              : `${doneToday} of ${dueToday.length} done today`
        }
        actions={
          <Button onClick={openNew}>
            <Plus /> New routine
          </Button>
        }
      />

      {routines.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No routines yet"
          description="Create a routine like “Morning walk” or “Read 20 pages” and check it off each day."
          action={
            <Button onClick={openNew}>
              <Plus /> New routine
            </Button>
          }
        />
      ) : (
        <TooltipProvider delayDuration={200}>
          <div className="grid gap-4 lg:grid-cols-2">
            {ordered.map((r) => (
              <RoutineCard
                key={r.id}
                routine={r}
                today={today}
                onEdit={() => {
                  setEditing(r);
                  setFormOpen(true);
                }}
                onDelete={() => setDeleting(r)}
              />
            ))}
          </div>
        </TooltipProvider>
      )}

      <RoutineFormDialog open={formOpen} onOpenChange={setFormOpen} routine={editing} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this routine?"
        description={`"${deleting?.name ?? ""}" and its entire completion history will be permanently removed.`}
        onConfirm={() => {
          if (deleting && deleteRoutine(deleting.id)) toast.success("Routine deleted");
        }}
      />
    </div>
  );
}

function RoutineCard({
  routine,
  today,
  onEdit,
  onDelete,
}: {
  routine: Routine;
  today: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const scheduledToday = isScheduledOn(routine, today);
  const doneToday = isCompletedOn(routine, today);
  const streak = currentStreak(routine, today);
  const best = bestStreak(routine, today);
  const rate = completionRate(routine, 30, today);
  const created = toDateKey(new Date(routine.createdAt));
  const history = Array.from({ length: HISTORY_DAYS }, (_, i) => shiftKey(today, i - HISTORY_DAYS + 1));

  const toggle = () => {
    if (setRoutineDone(routine.id, !doneToday, today)) {
      toast.success(doneToday ? `${routine.name} unchecked` : `${routine.name} done for today`);
    }
  };

  return (
    <Card className="flex min-w-0 flex-col p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="break-words font-semibold">{routine.name}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{describeSchedule(routine.days)}</p>
          {routine.description && (
            <p className="mt-2 line-clamp-2 break-words text-sm text-muted-foreground">{routine.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Actions for ${routine.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-secondary/60 p-3 text-center">
        <div>
          <dt className="eyebrow">Streak</dt>
          <dd className="mt-1 inline-flex items-center gap-1 text-lg font-semibold tabular-nums">
            {streak > 0 && <Flame className="size-4 text-warning" strokeWidth={1.75} />}
            {streak}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Best</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{best}</dd>
        </div>
        <div>
          <dt className="eyebrow">30 days</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {rate.scheduled === 0 ? "—" : `${Math.round(rate.rate * 100)}%`}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <p className="eyebrow mb-2">Last {HISTORY_DAYS} days</p>
        <div className="grid grid-cols-14 gap-1">
          {history.map((key) => {
            const scheduled = isScheduledOn(routine, key);
            const done = isCompletedOn(routine, key);
            const beforeStart = key < created;
            const label = `${format(fromDateKey(key), "EEE, MMM d")} — ${
              done ? "Completed" : beforeStart ? "Before routine started" : !scheduled ? "Not scheduled" : key === today ? "Pending" : "Missed"
            }`;
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <span
                    role="img"
                    aria-label={label}
                    tabIndex={0}
                    className={cn(
                      "aspect-square rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      done
                        ? "bg-primary"
                        : beforeStart || !scheduled
                          ? "bg-secondary/50"
                          : key === today
                            ? "border border-dashed border-muted-foreground/50"
                            : "bg-secondary",
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end border-t pt-4">
        {scheduledToday ? (
          <Button variant={doneToday ? "outline" : "default"} size="sm" onClick={toggle} aria-pressed={doneToday}>
            <Check /> {doneToday ? "Done today — undo" : "Mark done today"}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Not scheduled today</span>
        )}
      </div>
    </Card>
  );
}
