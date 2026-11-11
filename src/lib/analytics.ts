import { format } from "date-fns";
import { fromDateKey, shiftKey, todayKey, toDateKey } from "./dates";
import { isOverdue } from "./tasks";
import type { Task } from "./types";

/** Tasks completed on each of the last `days` days (oldest first). */
export function completionsByDay(tasks: Task[], days = 7, today: string = todayKey()) {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (!t.completed || !t.completedAt) continue;
    const key = toDateKey(new Date(t.completedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const key = shiftKey(today, i - days + 1);
    return {
      key,
      label: format(fromDateKey(key), "EEE"),
      fullLabel: format(fromDateKey(key), "EEEE, MMM d"),
      completed: counts.get(key) ?? 0,
    };
  });
}

export function taskStatusBreakdown(tasks: Task[], today: string = todayKey()) {
  const completed = tasks.filter((t) => t.completed).length;
  const overdue = tasks.filter((t) => isOverdue(t, today)).length;
  const pending = tasks.length - completed - overdue;
  return { completed, pending, overdue, total: tasks.length };
}

/** Tasks created vs completed, counted within the last `days` days. */
export function periodSummary(tasks: Task[], days: number, today: string = todayKey()) {
  const start = shiftKey(today, -(days - 1));
  const inRange = (iso: string | null) => {
    if (!iso) return false;
    const key = toDateKey(new Date(iso));
    return key >= start && key <= today;
  };
  return {
    created: tasks.filter((t) => inRange(t.createdAt)).length,
    completed: tasks.filter((t) => t.completed && inRange(t.completedAt)).length,
  };
}
