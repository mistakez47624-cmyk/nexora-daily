import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { emptyData, parseAppData } from "./schema";
import { todayKey } from "./dates";
import type { AppData, InboxCategory, InboxItem, Note, Priority, Routine, Task } from "./types";

export const STORAGE_KEY = "nexora:data:v1";

const SERVER_SNAPSHOT: AppData = emptyData();
let state: AppData = SERVER_SNAPSHOT;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    return parseAppData(JSON.parse(raw));
  } catch {
    return emptyData();
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  state = readStorage();
  loaded = true;
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      state = readStorage();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  ensureLoaded();
  return state;
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}

/** Apply a change and persist it. Returns false if the browser refused to save. */
function commit(updater: (prev: AppData) => AppData): boolean {
  ensureLoaded();
  const next = updater(state);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    toast.error("Couldn't save", { description: "Your browser storage may be full." });
    return false;
  }
  state = next;
  emit();
  return true;
}

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/* Tasks */
export interface TaskInput {
  title: string;
  description: string;
  dueDate: string | null;
  priority: Priority;
}

export function addTask(input: TaskInput): Task | null {
  const t = now();
  const task: Task = {
    id: uid(),
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    completed: false,
    completedAt: null,
    createdAt: t,
    updatedAt: t,
  };
  return commit((s) => ({ ...s, tasks: [task, ...s.tasks] })) ? task : null;
}

export function updateTask(id: string, input: TaskInput): boolean {
  return commit((s) => ({
    ...s,
    tasks: s.tasks.map((x) =>
      x.id === id
        ? { ...x, ...input, title: input.title.trim(), description: input.description.trim(), updatedAt: now() }
        : x,
    ),
  }));
}

export function setTaskCompleted(id: string, completed: boolean): boolean {
  return commit((s) => ({
    ...s,
    tasks: s.tasks.map((x) =>
      x.id === id ? { ...x, completed, completedAt: completed ? now() : null, updatedAt: now() } : x,
    ),
  }));
}

export function deleteTask(id: string): boolean {
  return commit((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== id) }));
}

/* Notes */
export function addNote(partial: Partial<Pick<Note, "title" | "content" | "tags">> = {}): Note | null {
  const t = now();
  const note: Note = {
    id: uid(),
    title: partial.title ?? "",
    content: partial.content ?? "",
    tags: partial.tags ?? [],
    createdAt: t,
    updatedAt: t,
  };
  return commit((s) => ({ ...s, notes: [note, ...s.notes] })) ? note : null;
}

export function updateNote(id: string, patch: Partial<Pick<Note, "title" | "content" | "tags">>): boolean {
  return commit((s) => ({
    ...s,
    notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)),
  }));
}

export function deleteNote(id: string): boolean {
  return commit((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
}

/* Inbox */
export function addInboxItem(content: string, category: InboxCategory): InboxItem | null {
  const item: InboxItem = {
    id: uid(),
    content: content.trim(),
    category,
    processed: false,
    createdAt: now(),
    processedAt: null,
  };
  return commit((s) => ({ ...s, inbox: [item, ...s.inbox] })) ? item : null;
}

export function updateInboxItem(id: string, patch: Partial<Pick<InboxItem, "content" | "category">>): boolean {
  return commit((s) => ({
    ...s,
    inbox: s.inbox.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  }));
}

export function setInboxProcessed(id: string, processed: boolean): boolean {
  return commit((s) => ({
    ...s,
    inbox: s.inbox.map((i) => (i.id === id ? { ...i, processed, processedAt: processed ? now() : null } : i)),
  }));
}

export function deleteInboxItem(id: string): boolean {
  return commit((s) => ({ ...s, inbox: s.inbox.filter((i) => i.id !== id) }));
}

function splitCapture(content: string) {
  const [first, ...rest] = content.trim().split("\n");
  const title = first.trim().slice(0, 200);
  const body = [first.length > 200 ? first.slice(200) : "", ...rest].join("\n").trim();
  return { title, body };
}

/** Turn an inbox entry into a task and mark the entry processed. */
export function convertInboxToTask(id: string): Task | null {
  const item = state.inbox.find((i) => i.id === id);
  if (!item) return null;
  const { title, body } = splitCapture(item.content);
  const t = now();
  const task: Task = {
    id: uid(),
    title,
    description: body,
    dueDate: null,
    priority: "medium",
    completed: false,
    completedAt: null,
    createdAt: t,
    updatedAt: t,
  };
  const ok = commit((s) => ({
    ...s,
    tasks: [task, ...s.tasks],
    inbox: s.inbox.map((i) => (i.id === id ? { ...i, processed: true, processedAt: t } : i)),
  }));
  return ok ? task : null;
}

/** Turn an inbox entry into a note and mark the entry processed. */
export function convertInboxToNote(id: string): Note | null {
  const item = state.inbox.find((i) => i.id === id);
  if (!item) return null;
  const { title, body } = splitCapture(item.content);
  const t = now();
  const note: Note = {
    id: uid(),
    title,
    content: body,
    tags: item.category === "idea" ? ["idea"] : [],
    createdAt: t,
    updatedAt: t,
  };
  const ok = commit((s) => ({
    ...s,
    notes: [note, ...s.notes],
    inbox: s.inbox.map((i) => (i.id === id ? { ...i, processed: true, processedAt: t } : i)),
  }));
  return ok ? note : null;
}

/* Routines */
export interface RoutineInput {
  name: string;
  description: string;
  days: number[];
}

export function addRoutine(input: RoutineInput): Routine | null {
  const routine: Routine = {
    id: uid(),
    name: input.name.trim(),
    description: input.description.trim(),
    days: [...input.days].sort(),
    completions: [],
    createdAt: now(),
  };
  return commit((s) => ({ ...s, routines: [...s.routines, routine] })) ? routine : null;
}

export function updateRoutine(id: string, input: RoutineInput): boolean {
  return commit((s) => ({
    ...s,
    routines: s.routines.map((r) =>
      r.id === id
        ? { ...r, name: input.name.trim(), description: input.description.trim(), days: [...input.days].sort() }
        : r,
    ),
  }));
}

export function setRoutineDone(id: string, done: boolean, key: string = todayKey()): boolean {
  return commit((s) => ({
    ...s,
    routines: s.routines.map((r) => {
      if (r.id !== id) return r;
      const set = new Set(r.completions);
      if (done) set.add(key);
      else set.delete(key);
      return { ...r, completions: [...set].sort() };
    }),
  }));
}

export function deleteRoutine(id: string): boolean {
  return commit((s) => ({ ...s, routines: s.routines.filter((r) => r.id !== id) }));
}

/* Profile & data */
export function setProfileName(name: string): boolean {
  return commit((s) => ({ ...s, profile: { ...s.profile, name: name.trim() } }));
}

export function replaceAllData(data: AppData): boolean {
  return commit(() => data);
}

export function clearAllData(): boolean {
  return commit(() => emptyData());
}

export function exportData(): AppData {
  ensureLoaded();
  return state;
}
