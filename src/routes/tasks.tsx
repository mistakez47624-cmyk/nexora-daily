import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckSquare, Plus, Search, SearchX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/nexora/confirm-dialog";
import { EmptyState } from "@/components/nexora/empty-state";
import { PageHeader } from "@/components/nexora/page-header";
import { TaskFormDialog } from "@/components/nexora/task-form-dialog";
import { TaskInsights } from "@/components/nexora/task-insights";
import { TaskRow } from "@/components/nexora/task-row";
import { todayKey } from "@/lib/dates";
import { deleteTask, useAppData } from "@/lib/store";
import {
  filterTasks,
  isOverdue,
  type TaskPriorityFilter,
  type TaskSort,
  type TaskStatusFilter,
} from "@/lib/tasks";
import type { Task } from "@/lib/types";
import { cn, pluralize } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — NEXORA" },
      {
        name: "description",
        content: "Plan tasks and see completion, overdue work, and routine consistency together.",
      },
      { property: "og:title", content: "Tasks — NEXORA" },
      {
        property: "og:description",
        content: "Plan tasks and see completion, overdue work, and routine consistency together.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TasksPage,
});

const STATUS_TABS: { value: TaskStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];

function TasksPage() {
  const { tasks } = useAppData();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskStatusFilter>("active");
  const [priority, setPriority] = useState<TaskPriorityFilter>("all");
  const [sort, setSort] = useState<TaskSort>("due");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const today = todayKey();
  const counts = useMemo(
    () => ({
      all: tasks.length,
      active: tasks.filter((t) => !t.completed).length,
      completed: tasks.filter((t) => t.completed).length,
      overdue: tasks.filter((t) => isOverdue(t, today)).length,
    }),
    [tasks, today],
  );
  const visible = useMemo(
    () => filterTasks(tasks, { search, status, priority, sort }, today),
    [tasks, search, status, priority, sort, today],
  );
  const filtersActive = search.trim() !== "" || priority !== "all";

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const resetFilters = () => {
    setSearch("");
    setPriority("all");
    setStatus("all");
  };

  const emailTask = (task: Task) => {
    void navigate({
      to: "/mail",
      search: {
        subject: task.title,
        body: task.description,
      },
    });
  };

  return (
    <div>
      <PageHeader
        title="Tasks"
        description={`${pluralize(counts.active, "open task")}${counts.overdue ? ` · ${counts.overdue} overdue` : ""}. Progress stays beside the list.`}
        actions={
          <Button onClick={openNew}>
            <Plus /> New task
          </Button>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Create your first task. Completion and overdue counts update beside the list as you go."
          action={
            <Button onClick={openNew}>
              <Plus /> New task
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden bg-card">
          <div className="space-y-3 border-b p-3 sm:p-4">
            <div
              role="tablist"
              aria-label="Filter by status"
              className="grid grid-cols-4 gap-1 rounded-lg bg-secondary p-1 sm:flex sm:w-fit"
            >
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  role="tab"
                  type="button"
                  aria-selected={status === tab.value}
                  onClick={() => setStatus(tab.value)}
                  className={cn(
                    "flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md px-1.5 py-1.5 text-[13px] font-medium sm:px-3 sm:text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    status === tab.value && "bg-card text-foreground shadow-card",
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "hidden rounded px-1.5 text-xs tabular-nums sm:inline",
                      tab.value === "overdue" && counts.overdue > 0
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {counts[tab.value]}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks"
                  aria-label="Search tasks"
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as TaskPriorityFilter)}
                >
                  <SelectTrigger className="sm:w-40" aria-label="Filter by priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="high">High priority</SelectItem>
                    <SelectItem value="medium">Medium priority</SelectItem>
                    <SelectItem value="low">Low priority</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(v) => setSort(v as TaskSort)}>
                  <SelectTrigger className="sm:w-44" aria-label="Sort tasks">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due">Sort: Due date</SelectItem>
                    <SelectItem value="newest">Sort: Newest first</SelectItem>
                    <SelectItem value="oldest">Sort: Oldest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="p-2">
            {visible.length === 0 ? (
              <EmptyState
                compact
                icon={filtersActive ? SearchX : CheckSquare}
                title={filtersActive ? "No tasks match your filters" : emptyTitle(status)}
                description={filtersActive ? "Try a different search or priority." : undefined}
                action={
                  filtersActive || status !== "all" ? (
                    <Button size="sm" variant="outline" onClick={resetFilters}>
                      Show all tasks
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="divide-y divide-border/60">
                {visible.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onEdit={(task) => {
                      setEditing(task);
                      setFormOpen(true);
                    }}
                    onDelete={setDeleting}
                    onEmail={emailTask}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
        <TaskInsights />
      </div>

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editing} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this task?"
        description={`"${deleting?.title ?? ""}" will be permanently removed.`}
        onConfirm={() => {
          if (deleting && deleteTask(deleting.id)) toast.success("Task deleted");
        }}
      />
    </div>
  );
}

function emptyTitle(status: TaskStatusFilter) {
  switch (status) {
    case "active":
      return "All caught up — no open tasks";
    case "completed":
      return "No completed tasks yet";
    case "overdue":
      return "Nothing overdue";
    default:
      return "No tasks";
  }
}
