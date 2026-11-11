import { todayKey, daysBetween } from "./dates";
import type { Priority, Task } from "./types";

export type TaskStatusFilter = "all" | "active" | "completed" | "overdue";
export type TaskPriorityFilter = "all" | Priority;
export type TaskSort = "due" | "newest" | "oldest";

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function isOverdue(task: Task, today: string = todayKey()): boolean {
  return !task.completed && task.dueDate !== null && task.dueDate < today;
}

export function isDueToday(task: Task, today: string = todayKey()): boolean {
  return task.dueDate === today;
}

export interface TaskQuery {
  search: string;
  status: TaskStatusFilter;
  priority: TaskPriorityFilter;
  sort: TaskSort;
}

export function filterTasks(tasks: Task[], q: TaskQuery, today: string = todayKey()): Task[] {
  const term = q.search.trim().toLowerCase();
  const result = tasks.filter((t) => {
    if (term && !`${t.title} ${t.description}`.toLowerCase().includes(term)) return false;
    if (q.priority !== "all" && t.priority !== q.priority) return false;
    switch (q.status) {
      case "active":
        return !t.completed;
      case "completed":
        return t.completed;
      case "overdue":
        return isOverdue(t, today);
      default:
        return true;
    }
  });
  return sortTasks(result, q.sort);
}

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const copy = [...tasks];
  if (sort === "newest") return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === "oldest") return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  // Due date ascending; tasks without a due date go last; ties broken by priority.
  return copy.sort((a, b) => {
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate)
      return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (p !== 0) return p;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Incomplete tasks due after today and within `days` days. */
export function upcomingTasks(tasks: Task[], days = 7, today: string = todayKey()): Task[] {
  return sortTasks(
    tasks.filter((t) => {
      if (t.completed || !t.dueDate) return false;
      const diff = daysBetween(today, t.dueDate);
      return diff > 0 && diff <= days;
    }),
    "due",
  );
}
