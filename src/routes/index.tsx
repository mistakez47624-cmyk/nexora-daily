import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format, formatDistanceToNow, startOfWeek } from "date-fns";
import { ArrowRight, CalendarClock, CheckCircle2, Repeat, StickyNote } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/nexora/empty-state";
import { QuickCapture } from "@/components/nexora/quick-capture";
import { SectionCard, StatCard } from "@/components/nexora/section-card";
import { TaskRow } from "@/components/nexora/task-row";
import { formatDue, greeting, todayKey } from "@/lib/dates";
import { currentStreak, isCompletedOn, routinesDueOn } from "@/lib/routines";
import { setRoutineDone, useAppData } from "@/lib/store";
import { isOverdue, sortTasks, upcomingTasks } from "@/lib/tasks";
import { cn, pluralize } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — NEXORA" },
      { name: "description", content: "Your day at a glance: today's tasks, deadlines, routines and recent notes." },
      { property: "og:title", content: "Dashboard — NEXORA" },
      { property: "og:description", content: "Your day at a glance: today's tasks, deadlines, routines and recent notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const data = useAppData();
  const now = new Date();
  const today = todayKey(now);

  const stats = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const todays = data.tasks.filter((t) => t.dueDate === today);
    const overdue = data.tasks.filter((t) => isOverdue(t, today));
    const open = data.tasks.filter((t) => !t.completed);
    const doneThisWeek = data.tasks.filter((t) => t.completedAt && t.completedAt >= weekStart);
    const routinesToday = routinesDueOn(data.routines, today);
    const routinesDone = routinesToday.filter((r) => isCompletedOn(r, today));
    const dayTotal = todays.length + routinesToday.length;
    const dayDone = todays.filter((t) => t.completed).length + routinesDone.length;
    return {
      todayList: [...sortTasks(overdue, "due"), ...sortTasks(todays, "due").sort((a, b) => Number(a.completed) - Number(b.completed))],
      overdue,
      open,
      doneThisWeek,
      routinesToday,
      routinesDone,
      dayTotal,
      dayDone,
      upcoming: upcomingTasks(data.tasks, 7, today).slice(0, 5),
      recentNotes: [...data.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, today]);

  const dayPct = stats.dayTotal === 0 ? 0 : Math.round((stats.dayDone / stats.dayTotal) * 100);
  const name = data.profile.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{format(now, "EEEE, MMMM d")}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting(now)}
          {name ? `, ${name}` : ""}
        </h1>
      </div>

      <Card className="p-4 sm:p-5">
        <QuickCapture showViewAction />
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="col-span-2 min-w-0 p-5 lg:col-span-1">
          <p className="eyebrow">Today's progress</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{dayPct}%</p>
          <Progress value={dayPct} className="mt-3 h-1.5" aria-label="Today's progress" />
          <p className="mt-2 text-xs text-muted-foreground">
            {stats.dayTotal === 0 ? "Nothing scheduled today" : `${stats.dayDone} of ${stats.dayTotal} done`}
          </p>
        </Card>
        <StatCard label="Open tasks" value={stats.open.length} hint={`${pluralize(data.tasks.length, "task")} in total`} />
        <StatCard label="Done this week" value={stats.doneThisWeek.length} hint="Since Monday" />
        <StatCard
          label="Overdue"
          value={stats.overdue.length}
          tone={stats.overdue.length > 0 ? "danger" : "default"}
          hint={stats.overdue.length > 0 ? "Needs attention" : "You're on track"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Today's tasks"
          className="lg:col-span-2"
          action={<ViewAll to="/tasks" label="All tasks" />}
        >
          {stats.todayList.length === 0 ? (
            <EmptyState
              compact
              icon={CheckCircle2}
              title="Nothing due today"
              description="Tasks due today and anything overdue will show up here."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link to="/tasks">Go to tasks</Link>
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border/60">
              {stats.todayList.map((t) => (
                <TaskRow key={t.id} task={t} compact />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Upcoming deadlines" action={<ViewAll to="/tasks" label="All tasks" />}>
          {stats.upcoming.length === 0 ? (
            <EmptyState compact icon={CalendarClock} title="No upcoming deadlines" description="Nothing due in the next 7 days." />
          ) : (
            <ul className="divide-y divide-border/60">
              {stats.upcoming.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="min-w-0 truncate text-sm">{t.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDue(t.dueDate!, now)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Routines today"
          action={
            stats.routinesToday.length > 0 ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {stats.routinesDone.length}/{stats.routinesToday.length}
              </span>
            ) : (
              <ViewAll to="/routines" label="Routines" />
            )
          }
        >
          {stats.routinesToday.length === 0 ? (
            <EmptyState
              compact
              icon={Repeat}
              title={data.routines.length === 0 ? "No routines yet" : "Rest day"}
              description={data.routines.length === 0 ? "Create a routine to build a daily habit." : "No routines are scheduled for today."}
              action={
                data.routines.length === 0 ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/routines">Create a routine</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-0.5">
              {stats.routinesToday.map((r) => {
                const done = isCompletedOn(r, today);
                const streak = currentStreak(r, today);
                return (
                  <li key={r.id} className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-accent/50">
                    <Checkbox
                      id={`dash-routine-${r.id}`}
                      checked={done}
                      onCheckedChange={(v) => {
                        if (setRoutineDone(r.id, v === true, today)) {
                          toast.success(v === true ? `${r.name} done for today` : `${r.name} unchecked`);
                        }
                      }}
                    />
                    <label htmlFor={`dash-routine-${r.id}`} className={cn("min-w-0 flex-1 cursor-pointer truncate text-sm", done && "text-muted-foreground line-through")}>
                      {r.name}
                    </label>
                    {streak > 0 && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{streak}-day streak</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent notes" className="lg:col-span-2" action={<ViewAll to="/notes" label="All notes" />}>
          {stats.recentNotes.length === 0 ? (
            <EmptyState
              compact
              icon={StickyNote}
              title="No notes yet"
              description="Jot down thoughts, meeting notes or anything worth keeping."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link to="/notes">Write a note</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-1 sm:grid-cols-2">
              {stats.recentNotes.map((n) => (
                <Link
                  key={n.id}
                  to="/notes"
                  search={{ id: n.id }}
                  className="block min-w-0 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="truncate text-sm font-medium">{n.title || "Untitled note"}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.content || "No content"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Edited {formatDistanceToNow(new Date(n.updatedAt), { addSuffix: true })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

    </div>
  );
}

function ViewAll({ to, label }: { to: "/tasks" | "/notes" | "/routines"; label: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
      <Link to={to}>
        {label} <ArrowRight className="size-3.5" />
      </Link>
    </Button>
  );
}
