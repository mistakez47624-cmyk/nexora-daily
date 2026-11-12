import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

/** Local calendar date key, yyyy-MM-dd */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

/** Parse a yyyy-MM-dd key as a local date (not UTC). */
export function fromDateKey(key: string): Date {
  return parseISO(key);
}

export function shiftKey(key: string, days: number): string {
  return toDateKey(addDays(fromDateKey(key), days));
}

export function daysBetween(fromKey: string, toKey: string): number {
  return differenceInCalendarDays(fromDateKey(toKey), fromDateKey(fromKey));
}

/** Human label for a due date relative to today. */
export function formatDue(key: string, now: Date = new Date()): string {
  const diff = daysBetween(todayKey(now), key);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  if (diff < 7) return format(fromDateKey(key), "EEEE");
  const sameYear = fromDateKey(key).getFullYear() === now.getFullYear();
  return format(fromDateKey(key), sameYear ? "MMM d" : "MMM d, yyyy");
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
