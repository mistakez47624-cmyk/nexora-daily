import { describe, expect, it } from "vitest";
import { completionsByDay, taskStatusBreakdown } from "@/lib/analytics";
import { bestStreak, completionRate, currentStreak, describeSchedule } from "@/lib/routines";
import { parseAppData } from "@/lib/schema";
import { filterTasks, isOverdue, sortTasks, upcomingTasks } from "@/lib/tasks";
import type { Routine, Task } from "@/lib/types";

const TODAY = "2026-11-11"; // a Wednesday

function task(p: Partial<Task>): Task {
  return {
    id: Math.random().toString(36),
    title: "Task",
    description: "",
    dueDate: null,
    priority: "medium",
    completed: false,
    completedAt: null,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
    ...p,
  };
}

function routine(p: Partial<Routine>): Routine {
  return {
    id: "r1",
    name: "Walk",
    description: "",
    days: [0, 1, 2, 3, 4, 5, 6],
    completions: [],
    createdAt: new Date(2026, 9, 1, 9).toISOString(),
    ...p,
  };
}

describe("tasks", () => {
  it("an incomplete task due before today is overdue", () => {
    expect(isOverdue(task({ dueDate: "2026-11-10" }), TODAY)).toBe(true);
  });
  it("a task due today is not overdue", () => {
    expect(isOverdue(task({ dueDate: TODAY }), TODAY)).toBe(false);
  });
  it("a completed task is never overdue", () => {
    expect(isOverdue(task({ dueDate: "2026-11-01", completed: true }), TODAY)).toBe(false);
  });
  it("due-date sort puts earliest first and undated tasks last", () => {
    const a = task({ id: "a", dueDate: "2026-11-20" });
    const b = task({ id: "b", dueDate: null });
    const c = task({ id: "c", dueDate: "2026-11-12" });
    expect(sortTasks([a, b, c], "due").map((t) => t.id)).toEqual(["c", "a", "b"]);
  });
  it("newest sort orders by creation date descending", () => {
    const a = task({ id: "a", createdAt: "2026-11-01T00:00:00Z" });
    const b = task({ id: "b", createdAt: "2026-11-05T00:00:00Z" });
    expect(sortTasks([a, b], "newest").map((t) => t.id)).toEqual(["b", "a"]);
  });
  it("search matches title or description, case-insensitively", () => {
    const list = [
      task({ id: "a", title: "Buy milk" }),
      task({ id: "b", title: "Call", description: "about MILK delivery" }),
      task({ id: "c", title: "Gym" }),
    ];
    const res = filterTasks(
      list,
      { search: "milk", status: "all", priority: "all", sort: "newest" },
      TODAY,
    );
    expect(res.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });
  it("status and priority filters combine", () => {
    const list = [
      task({ id: "a", priority: "high" }),
      task({ id: "b", priority: "high", completed: true }),
      task({ id: "c", priority: "low" }),
    ];
    const res = filterTasks(
      list,
      { search: "", status: "active", priority: "high", sort: "due" },
      TODAY,
    );
    expect(res.map((t) => t.id)).toEqual(["a"]);
  });
  it("upcoming deadlines cover the next 7 days, excluding today", () => {
    const list = [
      task({ id: "today", dueDate: TODAY }),
      task({ id: "in7", dueDate: "2026-11-18" }),
      task({ id: "in8", dueDate: "2026-11-19" }),
    ];
    expect(upcomingTasks(list, 7, TODAY).map((t) => t.id)).toEqual(["in7"]);
  });
});

describe("routines", () => {
  it("streak counts consecutive completed days up to today", () => {
    const r = routine({ completions: ["2026-11-09", "2026-11-10", "2026-11-11"] });
    expect(currentStreak(r, TODAY)).toBe(3);
  });
  it("an unfinished today does not break the streak", () => {
    const r = routine({ completions: ["2026-11-09", "2026-11-10"] });
    expect(currentStreak(r, TODAY)).toBe(2);
  });
  it("a missed scheduled day resets the streak", () => {
    const r = routine({ completions: ["2026-11-08", "2026-11-10"] });
    expect(currentStreak(r, TODAY)).toBe(1);
  });
  it("unscheduled days are skipped, not counted as misses", () => {
    // Weekdays only: Fri 6th, Mon 9th, Tue 10th done; weekend skipped.
    const r = routine({
      days: [1, 2, 3, 4, 5],
      completions: ["2026-11-06", "2026-11-09", "2026-11-10"],
    });
    expect(currentStreak(r, TODAY)).toBe(3);
  });
  it("best streak remembers the longest run", () => {
    const r = routine({
      completions: ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-10"],
    });
    expect(bestStreak(r, TODAY)).toBe(4);
  });
  it("completion rate ignores today until it is done", () => {
    const r = routine({
      createdAt: new Date(2026, 10, 8, 9).toISOString(),
      completions: ["2026-11-08", "2026-11-10"],
    });
    expect(completionRate(r, 30, TODAY)).toEqual({ done: 2, scheduled: 3, rate: 2 / 3 });
  });
  it("describes common schedules in plain words", () => {
    expect(describeSchedule([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
    expect(describeSchedule([1, 2, 3, 4, 5])).toBe("Weekdays");
    expect(describeSchedule([0, 6])).toBe("Weekends");
  });
});

describe("analytics", () => {
  it("weekly chart counts real completions per day", () => {
    const list = [
      task({ completed: true, completedAt: new Date(2026, 10, 11, 9).toISOString() }),
      task({ completed: true, completedAt: new Date(2026, 10, 11, 15).toISOString() }),
      task({ completed: true, completedAt: new Date(2026, 10, 9, 15).toISOString() }),
      task({ completed: false }),
    ];
    const days = completionsByDay(list, 7, TODAY);
    expect(days).toHaveLength(7);
    expect(days.at(-1)).toMatchObject({ key: TODAY, completed: 2 });
    expect(days.find((d) => d.key === "2026-11-09")?.completed).toBe(1);
    expect(days.reduce((s, d) => s + d.completed, 0)).toBe(3);
  });
  it("status breakdown splits completed, pending and overdue", () => {
    const list = [
      task({ completed: true }),
      task({ dueDate: "2026-11-01" }),
      task({ dueDate: "2026-12-01" }),
      task({}),
    ];
    expect(taskStatusBreakdown(list, TODAY)).toEqual({
      completed: 1,
      pending: 2,
      overdue: 1,
      total: 4,
    });
  });
});

describe("backup import", () => {
  it("rejects files that are not NEXORA backups", () => {
    expect(() => parseAppData({ tasks: [{ nope: true }] })).toThrow();
  });
  it("accepts a valid backup and fills in defaults", () => {
    const data = parseAppData({ tasks: [], notes: [] });
    expect(data).toMatchObject({ version: 1, inbox: [], routines: [], profile: { name: "" } });
  });
});
