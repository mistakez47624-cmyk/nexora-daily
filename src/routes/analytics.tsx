import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, PieChart as PieIcon, Repeat } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/nexora/empty-state";
import { PageHeader } from "@/components/nexora/page-header";
import { SectionCard, StatCard } from "@/components/nexora/section-card";
import { completionsByDay, periodSummary, taskStatusBreakdown } from "@/lib/analytics";
import { todayKey } from "@/lib/dates";
import { completionRate, currentStreak } from "@/lib/routines";
import { useAppData } from "@/lib/store";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — NEXORA" },
      {
        name: "description",
        content: "See how your week is going: task completion, progress and routine consistency.",
      },
      { property: "og:title", content: "Analytics — NEXORA" },
      {
        property: "og:description",
        content: "See how your week is going: task completion, progress and routine consistency.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

const weeklyConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
} satisfies ChartConfig;
const statusConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
  pending: { label: "Pending", color: "var(--chart-3)" },
  overdue: { label: "Overdue", color: "var(--chart-4)" },
} satisfies ChartConfig;
const routineConfig = {
  rate: { label: "Completion", color: "var(--chart-1)" },
} satisfies ChartConfig;

function AnalyticsPage() {
  const { tasks, routines } = useAppData();
  const today = todayKey();

  const weekly = useMemo(() => completionsByDay(tasks, 7, today), [tasks, today]);
  const status = useMemo(() => taskStatusBreakdown(tasks, today), [tasks, today]);
  const thisWeek = useMemo(() => periodSummary(tasks, 7, today), [tasks, today]);
  const routineStats = useMemo(
    () =>
      routines.map((r) => {
        const c = completionRate(r, 30, today);
        return {
          id: r.id,
          name: r.name,
          rate: Math.round(c.rate * 100),
          done: c.done,
          scheduled: c.scheduled,
          streak: currentStreak(r, today),
        };
      }),
    [routines, today],
  );

  const weeklyTotal = weekly.reduce((s, d) => s + d.completed, 0);
  const completionPct =
    status.total === 0 ? 0 : Math.round((status.completed / status.total) * 100);
  const routineAvg =
    routineStats.filter((r) => r.scheduled > 0).length === 0
      ? null
      : Math.round(
          routineStats.filter((r) => r.scheduled > 0).reduce((s, r) => s + r.rate, 0) /
            routineStats.filter((r) => r.scheduled > 0).length,
        );
  const pieData = (["completed", "pending", "overdue"] as const)
    .map((k) => ({ key: k, name: statusConfig[k].label, value: status[k] }))
    .filter((d) => d.value > 0);

  if (tasks.length === 0 && routines.length === 0) {
    return (
      <div>
        <PageHeader
          title="Analytics"
          description="Insights based on your own tasks and routines."
        />
        <EmptyState
          icon={BarChart3}
          title="No data to analyze yet"
          description="Charts appear here as you create and complete tasks and routines."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link to="/tasks">Add a task</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/routines">Create a routine</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Insights based on your own tasks and routines." />

      <section aria-label="Productivity overview" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Completion rate"
          value={`${completionPct}%`}
          hint={`${status.completed} of ${status.total} tasks done`}
        />
        <StatCard
          label="Done last 7 days"
          value={thisWeek.completed}
          hint={`${thisWeek.created} created in the same period`}
        />
        <StatCard
          label="Overdue"
          value={status.overdue}
          tone={status.overdue > 0 ? "danger" : "default"}
          hint={status.overdue > 0 ? "Past their due date" : "Nothing overdue"}
        />
        <StatCard
          label="Routine consistency"
          value={routineAvg === null ? "—" : `${routineAvg}%`}
          hint={routineAvg === null ? "No routine history yet" : "Average over 30 days"}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard
          title="Tasks completed — last 7 days"
          className="lg:col-span-3"
          action={
            <span className="text-xs tabular-nums text-muted-foreground">{weeklyTotal} total</span>
          }
        >
          {weeklyTotal === 0 ? (
            <EmptyState
              compact
              icon={BarChart3}
              title="No tasks completed this week"
              description="Complete a task and it will show up here."
            />
          ) : (
            <ChartContainer config={weeklyConfig} className="aspect-auto h-64 w-full p-2">
              <BarChart data={weekly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                <ChartTooltip
                  cursor={{ fill: "var(--accent)", opacity: 0.5 }}
                  content={
                    <ChartTooltipContent labelFormatter={(_, p) => p?.[0]?.payload?.fullLabel} />
                  }
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="completed"
                  fill="var(--color-completed)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ChartContainer>
          )}
        </SectionCard>

        <SectionCard title="Completed vs pending" className="lg:col-span-2">
          {status.total === 0 ? (
            <EmptyState
              compact
              icon={PieIcon}
              title="No tasks yet"
              description="Add tasks to see their status breakdown."
            />
          ) : (
            <div className="flex flex-col items-center gap-4 p-3 sm:flex-row lg:flex-col">
              <ChartContainer config={statusConfig} className="aspect-square w-44 shrink-0">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
                  <Pie
                    isAnimationActive={false}
                    cx="50%"
                    cy="50%"
                    data={pieData}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={52}
                    outerRadius={80}
                    strokeWidth={2}
                    stroke="var(--card)"
                  >
                    {pieData.map((d) => (
                      <Cell key={d.key} fill={`var(--color-${d.key})`} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <ul className="w-full space-y-2 text-sm">
                {(["completed", "pending", "overdue"] as const).map((k) => (
                  <li key={k} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className="size-2.5 rounded-sm"
                        style={{ backgroundColor: statusConfig[k].color }}
                        aria-hidden
                      />
                      {statusConfig[k].label}
                    </span>
                    <span className="font-medium tabular-nums">
                      {status[k]}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({status.total === 0 ? 0 : Math.round((status[k] / status.total) * 100)}%)
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Routine completion — last 30 days">
        {routineStats.length === 0 ? (
          <EmptyState
            compact
            icon={Repeat}
            title="No routines yet"
            description="Create routines to track how consistently you follow them."
            action={
              <Button asChild size="sm" variant="outline">
                <Link to="/routines">Create a routine</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 p-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
            <ChartContainer
              config={routineConfig}
              className="aspect-auto w-full"
              style={{ height: Math.max(160, routineStats.length * 44 + 40) }}
            >
              <BarChart
                data={routineStats}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
                />
                <ChartTooltip
                  cursor={{ fill: "var(--accent)", opacity: 0.5 }}
                  content={
                    <ChartTooltipContent
                      formatter={(v, _n, item) =>
                        `${v}% · ${item.payload.done}/${item.payload.scheduled} days`
                      }
                    />
                  }
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="rate"
                  fill="var(--color-rate)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ChartContainer>
            <ul className="divide-y divide-border/60 self-start rounded-lg border">
              {routineStats.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">{r.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {r.streak}-day streak · {r.scheduled === 0 ? "—" : `${r.rate}%`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
