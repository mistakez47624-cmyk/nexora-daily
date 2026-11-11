import { fromDateKey, shiftKey, todayKey, toDateKey } from "./dates";
import type { Routine } from "./types";

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function isScheduledOn(routine: Routine, key: string): boolean {
  return routine.days.includes(fromDateKey(key).getDay());
}

export function isCompletedOn(routine: Routine, key: string): boolean {
  return routine.completions.includes(key);
}

function createdKey(routine: Routine): string {
  return toDateKey(new Date(routine.createdAt));
}

export function describeSchedule(days: number[]): string {
  const sorted = [...days].sort();
  if (sorted.length === 7) return "Every day";
  if (sorted.join() === "1,2,3,4,5") return "Weekdays";
  if (sorted.join() === "0,6") return "Weekends";
  if (sorted.length === 0) return "No days";
  return sorted.map((d) => WEEKDAY_SHORT[d]).join(", ");
}

/**
 * Consecutive scheduled days completed, counting back from today.
 * Unscheduled days are skipped. Today counts only once completed — an unfinished
 * today does not break the streak.
 */
export function currentStreak(routine: Routine, today: string = todayKey()): number {
  const start = createdKey(routine);
  const done = new Set(routine.completions);
  let streak = 0;
  let key = today;
  for (let i = 0; i < 3660 && key >= start; i++, key = shiftKey(key, -1)) {
    if (!isScheduledOn(routine, key)) continue;
    if (done.has(key)) streak++;
    else if (key === today) continue;
    else break;
  }
  return streak;
}

/** Longest run of consecutive completed scheduled days ever recorded. */
export function bestStreak(routine: Routine, today: string = todayKey()): number {
  if (routine.completions.length === 0) return 0;
  const done = new Set(routine.completions);
  const first = [...routine.completions].sort()[0];
  const start = first < createdKey(routine) ? first : createdKey(routine);
  let best = 0;
  let run = 0;
  for (let key = start, i = 0; key <= today && i < 3660; key = shiftKey(key, 1), i++) {
    if (!isScheduledOn(routine, key)) continue;
    if (done.has(key)) {
      run++;
      best = Math.max(best, run);
    } else if (key !== today) {
      run = 0;
    }
  }
  return best;
}

/**
 * Share of scheduled days completed over the last `days` days (since creation).
 * Today is only counted once it is completed.
 */
export function completionRate(
  routine: Routine,
  days = 30,
  today: string = todayKey(),
): { done: number; scheduled: number; rate: number } {
  const start = createdKey(routine);
  let done = 0;
  let scheduled = 0;
  for (let i = 0; i < days; i++) {
    const key = shiftKey(today, -i);
    if (key < start) break;
    if (!isScheduledOn(routine, key)) continue;
    const completed = isCompletedOn(routine, key);
    if (key === today && !completed) continue;
    scheduled++;
    if (completed) done++;
  }
  return { done, scheduled, rate: scheduled === 0 ? 0 : done / scheduled };
}

export function routinesDueOn(routines: Routine[], key: string = todayKey()): Routine[] {
  return routines.filter((r) => isScheduledOn(r, key));
}
