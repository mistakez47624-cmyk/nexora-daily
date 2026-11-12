import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, Repeat } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { completionsByDay, periodSummary, taskStatusBreakdown } from "@/lib/analytics";
import { todayKey } from "@/lib/dates";
import { completionRate, currentStreak } from "@/lib/routines";
import { useAppData } from "@/lib/store";
import { EmptyState } from "./empty-state";
import { SectionCard, StatCard } from "./section-card";

const weeklyConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
} satisfies ChartConfig;

const statusConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
  pending: { label: "Pending", color: "var(--chart-3)" },
  overdue: { label: "Overdue", color: "var(--chart-4)" },
} satisfies ChartConfig;

/** Progress for the task list: counts, the last week, and routine consistency. */
export function TaskInsights() {
  const { tasks, routines } = useAppData();
  const today = todayKey();

  const weekly = useMemo(() => completionsByDay(tasks, 7, today), [tasks, today]);
  const status = useMemo(() => taskStatusBreakdown(tasks, today), [tasks, today]);
  const thisWeek = useMemo(() => periodSummary(tasks, 7, today), [tasks, today]);
  const routineStats = useMemo(
    () =>
      routines.map((routine) => {
        const rate = completionRate(routine, 30, today);
        return {
          id: routine.id,
          name: routine.name,
          rate: Math.round(rate.rate * 100),
          scheduled: rate.scheduled,
          streak: currentStreak(routine, today),
        };
      }),
    [routines, today],
  );

  const weeklyTotal = weekly.reduce((sum, day) => sum + day.completed, 0);
  const completionPct = status.total === 0 ? 0 : Math.round((status.completed / status.total) * 100);
  const tracked = routineStats.filter((routine) => routine.scheduled > 0);
  const routineAvg =
    tracked.length === 0
      ? null
      : Math.round(tracked.reduce((sum, routine) => sum + routine.rate, 0) / tracked.length);
  const pieData = (["completed", "pending", "overdue"] as const)
    .map((key) => ({ key, value: status[key] }))
    .filter((item) => item.value > 0);

  return (
    <aside className="space-y-4" aria-label="Task progress">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Completion"
          value={`${completionPct}%`}
          hint={status.total === 0 ? "No tasks yet" : `${status.completed} of ${status.total} done`}
        />
        <StatCard
          label="This week"
          value={thisWeek.completed}
          hint={`${thisWeek.created} created`}
        />
        <StatCard
          label="Overdue"
          value={status.overdue}
          tone={status.overdue > 0 ? "danger" : "default"}
          hint={status.overdue > 0 ? "Past due" : "On track"}
        />
        <StatCard
          label="Routines"
          value={routineAvg === null ? "—" : `${routineAvg}%`}
          hint={routineAvg === null ? "No history yet" : "30-day average"}
        />
      </div>

      <SectionCard
        title="Completed this week"
        action={
          <span className="text-xs tabular-nums text-muted-foreground">{weeklyTotal} total</span>
        }
      >
        {weeklyTotal === 0 ? (
          <EmptyState
            compact
            icon={BarChart3}
            title="Nothing completed yet"
            description="Finished tasks show up here across the last 7 days."
          />
        ) : (
          <ChartContainer config={weeklyConfig} className="aspect-auto h-44 w-full">
            <BarChart data={weekly} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <ChartTooltip
                cursor={{ fill: "var(--accent)", opacity: 0.5 }}
                content={
                  <ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel} />
                }
              />
              <Bar
                isAnimationActive={false}
                dataKey="completed"
                fill="var(--color-completed)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ChartContainer>
        )}
      </SectionCard>

      <SectionCard title="Status">
        {status.total === 0 ? (
          <EmptyState compact icon={BarChart3} title="No tasks to chart" description="Add a task to see the split." />
        ) : (
          <div className="flex items-center gap-3 p-2">
            <ChartContainer config={statusConfig} className="aspect-square w-28 shrink-0">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
                <Pie
                  isAnimationActive={false}
                  data={pieData}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={32}
                  outerRadius={48}
                  strokeWidth={2}
                  stroke="var(--card)"
                >
                  {pieData.map((item) => (
                    <Cell key={item.key} fill={`var(--color-${item.key})`} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="min-w-0 flex-1 space-y-2 text-sm">
              {(["completed", "pending", "overdue"] as const).map((key) => (
                <li key={key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="size-2.5 rounded-sm"
                      style={{ backgroundColor: statusConfig[key].color }}
                      aria-hidden
                    />
                    {statusConfig[key].label}
                  </span>
                  <span className="font-medium tabular-nums">{status[key]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      {routineStats.length > 0 && (
        <SectionCard
          title="Routine streaks"
          action={
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
              <Link to="/routines">Routines</Link>
            </Button>
          }
        >
          <ul className="divide-y divide-border/60">
            {routineStats.map((routine) => (
              <li key={routine.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Repeat className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{routine.name}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {routine.streak}d · {routine.scheduled === 0 ? "—" : `${routine.rate}%`}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </aside>
  );
}
