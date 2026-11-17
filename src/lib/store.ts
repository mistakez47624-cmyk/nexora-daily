import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { emptyData, parseAppData } from "./schema";
import { todayKey } from "./dates";
import {
  CloudConflictError,
  loadCloudData,
  saveCloudData,
  subscribeCloudData,
  type CloudSnapshot,
} from "./cloud-data";
import { supabaseConfigured } from "./supabase";
import type {
  AppData,
  InboxCategory,
  InboxItem,
  MailAccount,
  MailProviderId,
  Note,
  Priority,
  Routine,
  SentMessage,
  Task,
} from "./types";

export const STORAGE_KEY = "nexora:data:v1";
const PENDING_KEY = "nexora:pending-cloud:v1:";

export type PersistencePhase =
  "local" | "signed-out" | "loading" | "synced" | "saving" | "error" | "conflict";
export interface PersistenceState {
  phase: PersistencePhase;
  error: string | null;
  revision: number;
  hasCloudRecord: boolean;
  legacyMigrated: boolean;
  remoteConflict: AppData | null;
}

const SERVER_SNAPSHOT: AppData = emptyData();
let state: AppData = SERVER_SNAPSHOT;
let loaded = false;
const listeners = new Set<() => void>();
const persistenceListeners = new Set<() => void>();
let accountId: string | null = null;
let revision = 0;
let hasCloudRecord = false;
let legacyMigrated = false;
let remoteConflict: AppData | null = null;
let dirty = false;
let saveGeneration = 0;
let flushPromise: Promise<boolean> | null = null;
let unsubscribeRealtime: (() => void) | null = null;
let persistenceState: PersistenceState = {
  phase: supabaseConfigured ? "signed-out" : "local",
  error: null,
  revision: 0,
  hasCloudRecord: false,
  legacyMigrated: false,
  remoteConflict: null,
};

function setPersistence(patch: Partial<PersistenceState>) {
  persistenceState = { ...persistenceState, ...patch };
  persistenceListeners.forEach((listener) => listener());
}

function emit() {
  listeners.forEach((listener) => listener());
}

function pendingKey(userId: string) {
  return `${PENDING_KEY}${userId}`;
}

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
  state = supabaseConfigured ? emptyData() : readStorage();
  loaded = true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (!supabaseConfigured && e.key === STORAGE_KEY) {
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

export function usePersistenceState(): PersistenceState {
  return useSyncExternalStore(
    (listener) => {
      persistenceListeners.add(listener);
      return () => persistenceListeners.delete(listener);
    },
    () => persistenceState,
    () => persistenceState,
  );
}

function applyRemote(snapshot: CloudSnapshot) {
  if (snapshot.revision < revision) return;
  revision = snapshot.revision;
  hasCloudRecord = snapshot.exists;
  legacyMigrated = snapshot.legacyMigrated;
}

/** Reset the external store before loading a new account to prevent cross-account flashes. */
export async function setActiveAccount(userId: string | null): Promise<void> {
  if (!supabaseConfigured) {
    accountId = null;
    state = readStorage();
    loaded = true;
    setPersistence({ phase: "local", error: null, remoteConflict: null });
    emit();
    return;
  }
  if (userId === accountId && persistenceState.phase !== "signed-out") return;

  unsubscribeRealtime?.();
  unsubscribeRealtime = null;
  accountId = userId;
  state = emptyData();
  loaded = true;
  revision = 0;
  hasCloudRecord = false;
  legacyMigrated = false;
  dirty = false;
  remoteConflict = null;
  emit();

  if (!userId) {
    setPersistence({
      phase: "signed-out",
      error: null,
      revision: 0,
      hasCloudRecord: false,
      legacyMigrated: false,
      remoteConflict: null,
    });
    return;
  }

  setPersistence({ phase: "loading", error: null, remoteConflict: null });
  try {
    const cloud = await loadCloudData(userId, emptyData());
    if (accountId !== userId) return;
    applyRemote(cloud);

    let cached: AppData | null = null;
    try {
      const rawPending = window.localStorage.getItem(pendingKey(userId));
      if (rawPending) cached = parseAppData(JSON.parse(rawPending));
    } catch {
      // Keep the original pending value for recovery; never replace it with empty data.
    }
    if (cached && JSON.stringify(cached) !== JSON.stringify(cloud.data)) {
      state = cached;
      dirty = true;
      remoteConflict = cloud.data;
      setPersistence({
        phase: "conflict",
        revision,
        hasCloudRecord,
        legacyMigrated,
        remoteConflict,
        error: "Unsynced changes from this device need your attention.",
      });
    } else {
      if (cached) window.localStorage.removeItem(pendingKey(userId));
      state = cloud.data;
      setPersistence({
        phase: "synced",
        revision,
        hasCloudRecord,
        legacyMigrated,
        remoteConflict: null,
        error: null,
      });
    }
    emit();
    unsubscribeRealtime = subscribeCloudData(
      userId,
      (latest) => {
        if (accountId !== userId || latest.revision <= revision) return;
        if (JSON.stringify(latest.data) === JSON.stringify(state)) {
          applyRemote(latest);
          setPersistence({
            phase: "synced",
            revision,
            hasCloudRecord,
            legacyMigrated,
            error: null,
          });
          return;
        }
        applyRemote(latest);
        remoteConflict = latest.data;
        dirty = true;
        try {
          window.localStorage.setItem(pendingKey(userId), JSON.stringify(state));
        } catch {
          // Current in-memory changes remain available and the conflict is still shown.
        }
        setPersistence({
          phase: "conflict",
          revision,
          hasCloudRecord,
          legacyMigrated,
          remoteConflict,
          error: "This account changed on another device. Choose which copy to keep.",
        });
      },
      emptyData(),
    );
  } catch (error) {
    if (accountId !== userId) return;
    setPersistence({ phase: "error", error: errorMessage(error) });
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not sync your data.";
}

function savePendingLocal(data: AppData) {
  if (!accountId) return;
  try {
    window.localStorage.setItem(pendingKey(accountId), JSON.stringify(data));
  } catch {
    setPersistence({ phase: "error", error: "Could not keep a recovery copy on this device." });
  }
}

function flushCloudWrites(): Promise<boolean> {
  if (!supabaseConfigured) return Promise.resolve(true);
  if (!accountId) return Promise.resolve(true);
  if (persistenceState.phase === "conflict") return Promise.resolve(false);
  if (flushPromise) return flushPromise;

  const userId = accountId;
  flushPromise = (async () => {
    try {
      while (dirty && accountId === userId && persistenceState.phase !== "conflict") {
        const generation = saveGeneration;
        const payload = state;
        const result = await saveCloudData(userId, payload, revision);
        if (accountId !== userId) return false;
        applyRemote(result);
        if (generation === saveGeneration) {
          dirty = false;
          window.localStorage.removeItem(pendingKey(userId));
          setPersistence({
            phase: "synced",
            error: null,
            revision,
            hasCloudRecord,
            legacyMigrated,
            remoteConflict: null,
          });
        }
      }
      return !dirty;
    } catch (error) {
      if (accountId !== userId) return false;
      if (error instanceof CloudConflictError) {
        applyRemote(error.latest);
        remoteConflict = error.latest.data;
        setPersistence({
          phase: "conflict",
          error: "Your cloud data changed before this save completed.",
          revision,
          hasCloudRecord,
          legacyMigrated,
          remoteConflict,
        });
      } else {
        setPersistence({ phase: "error", error: errorMessage(error) });
      }
      return false;
    } finally {
      flushPromise = null;
      if (dirty && accountId === userId && persistenceState.phase === "saving") {
        void flushCloudWrites();
      }
    }
  })();
  return flushPromise;
}

export async function flushCloudWritesForLogout(): Promise<boolean> {
  return flushCloudWrites();
}

export function retryCloudWrites() {
  if (!accountId || !dirty || persistenceState.phase === "conflict") return;
  setPersistence({ phase: "saving", error: null });
  void flushCloudWrites();
}

export function resolveCloudConflict(choice: "cloud" | "device") {
  if (!remoteConflict || !accountId) return;
  if (choice === "cloud") {
    state = remoteConflict;
    dirty = false;
    window.localStorage.removeItem(pendingKey(accountId));
    remoteConflict = null;
    setPersistence({
      phase: "synced",
      error: null,
      remoteConflict: null,
      revision,
      hasCloudRecord,
      legacyMigrated,
    });
    emit();
    return;
  }
  remoteConflict = null;
  dirty = true;
  saveGeneration++;
  savePendingLocal(state);
  setPersistence({
    phase: "saving",
    error: null,
    remoteConflict: null,
    revision,
    hasCloudRecord,
    legacyMigrated,
  });
  void flushCloudWrites();
}

/** Apply an optimistic change, then persist it locally or through the cloud adapter. */
function commit(updater: (prev: AppData) => AppData): boolean {
  ensureLoaded();
  if (supabaseConfigured && !accountId) {
    toast.error("Sign in to save changes");
    return false;
  }
  if (
    supabaseConfigured &&
    ["loading", "signed-out", "conflict"].includes(persistenceState.phase)
  ) {
    toast.error("Data is still syncing", {
      description: "Wait for sync to finish before editing.",
    });
    return false;
  }
  const next = updater(state);
  if (supabaseConfigured && accountId) {
    state = next;
    dirty = true;
    saveGeneration++;
    savePendingLocal(next);
    setPersistence({ phase: "saving", error: null });
    emit();
    void flushCloudWrites();
    return true;
  }
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
        ? {
            ...x,
            ...input,
            title: input.title.trim(),
            description: input.description.trim(),
            updatedAt: now(),
          }
        : x,
    ),
  }));
}

export function setTaskCompleted(id: string, completed: boolean): boolean {
  return commit((s) => ({
    ...s,
    tasks: s.tasks.map((x) =>
      x.id === id
        ? { ...x, completed, completedAt: completed ? now() : null, updatedAt: now() }
        : x,
    ),
  }));
}

export function deleteTask(id: string): boolean {
  return commit((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== id) }));
}

/* Notes */
export function addNote(
  partial: Partial<Pick<Note, "title" | "content" | "tags">> = {},
): Note | null {
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

export function updateNote(
  id: string,
  patch: Partial<Pick<Note, "title" | "content" | "tags">>,
): boolean {
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

export function updateInboxItem(
  id: string,
  patch: Partial<Pick<InboxItem, "content" | "category">>,
): boolean {
  return commit((s) => ({
    ...s,
    inbox: s.inbox.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  }));
}

export function setInboxProcessed(id: string, processed: boolean): boolean {
  return commit((s) => ({
    ...s,
    inbox: s.inbox.map((i) =>
      i.id === id ? { ...i, processed, processedAt: processed ? now() : null } : i,
    ),
  }));
}

export function deleteInboxItem(id: string): boolean {
  return commit((s) => ({ ...s, inbox: s.inbox.filter((i) => i.id !== id) }));
}

function splitCapture(content: string) {
  const [first = "", ...rest] = content.trim().split("\n");
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
        ? {
            ...r,
            name: input.name.trim(),
            description: input.description.trim(),
            days: [...input.days].sort(),
          }
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

/* Mail */
export function connectMailAccount(provider: MailProviderId, email: string): MailAccount | null {
  ensureLoaded();
  const normalized = email.trim().toLowerCase();
  if (
    state.mailAccounts.some(
      (account) => account.provider === provider && account.email === normalized,
    )
  ) {
    return null;
  }
  const account: MailAccount = {
    id: uid(),
    provider,
    email: normalized,
    connectedAt: now(),
  };
  return commit((s) => ({ ...s, mailAccounts: [...s.mailAccounts, account] })) ? account : null;
}

export function disconnectMailAccount(id: string): boolean {
  return commit((s) => ({
    ...s,
    mailAccounts: s.mailAccounts.filter((account) => account.id !== id),
  }));
}

export function recordSentMail(input: {
  accountId: string;
  to: string;
  subject: string;
  body: string;
}): SentMessage | null {
  const message: SentMessage = {
    id: uid(),
    accountId: input.accountId,
    to: input.to.trim(),
    subject: input.subject.trim(),
    body: input.body.trim(),
    sentAt: now(),
  };
  return commit((s) => ({ ...s, sentMail: [message, ...s.sentMail] })) ? message : null;
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

export interface LegacyInspection {
  raw: string | null;
  data: AppData | null;
  error: string | null;
}

/** Read-only inspection: the legacy value is never changed by the migration flow. */
export function inspectLegacyData(): LegacyInspection {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { raw: null, data: null, error: null };
    try {
      return { raw, data: parseAppData(JSON.parse(raw)), error: null };
    } catch (error) {
      return {
        raw,
        data: null,
        error: error instanceof Error ? error.message : "The saved data could not be validated.",
      };
    }
  } catch {
    return { raw: null, data: null, error: "Browser storage could not be read." };
  }
}

function mergeEntities<T extends { id: string }>(
  cloud: T[],
  local: T[],
  remap?: (item: T, id: string) => T,
): T[] {
  const merged = [...cloud];
  const byId = new Map(merged.map((item) => [item.id, item]));
  for (const original of local) {
    const existing = byId.get(original.id);
    if (!existing) {
      merged.push(original);
      byId.set(original.id, original);
    } else if (JSON.stringify(existing) !== JSON.stringify(original)) {
      const id = crypto.randomUUID();
      const copy = remap ? remap(original, id) : { ...original, id };
      merged.push(copy);
      byId.set(id, copy);
    }
  }
  return merged;
}

function mergeLegacyData(local: AppData, cloud: AppData): AppData {
  const localToCloudAccountId = new Map<string, string>();
  const mailAccounts = mergeEntities(cloud.mailAccounts, local.mailAccounts, (item, id) => {
    localToCloudAccountId.set(item.id, id);
    return { ...item, id };
  });
  for (const account of local.mailAccounts) {
    if (!localToCloudAccountId.has(account.id)) localToCloudAccountId.set(account.id, account.id);
  }
  const sentMail = mergeEntities(
    cloud.sentMail,
    local.sentMail.map((message) => ({
      ...message,
      accountId: localToCloudAccountId.get(message.accountId) ?? message.accountId,
    })),
  );
  return parseAppData({
    version: 1,
    profile: { name: cloud.profile.name || local.profile.name },
    tasks: mergeEntities(cloud.tasks, local.tasks),
    notes: mergeEntities(cloud.notes, local.notes),
    inbox: mergeEntities(cloud.inbox, local.inbox),
    routines: mergeEntities(cloud.routines, local.routines),
    mailAccounts,
    sentMail,
  });
}

/** Import only after explicit user choice; retain localStorage until cloud verification succeeds. */
export async function migrateLegacyData(): Promise<boolean> {
  const userId = accountId;
  const local = inspectLegacyData();
  if (!userId || !local.data || legacyMigrated || persistenceState.phase !== "synced") return false;
  const merged = hasCloudRecord ? mergeLegacyData(local.data, state) : local.data;
  setPersistence({ phase: "saving", error: null });
  try {
    const verified = await saveCloudData(userId, merged, revision, true);
    if (accountId !== userId) return false;
    applyRemote(verified);
    state = verified.data;
    dirty = false;
    window.localStorage.removeItem(pendingKey(userId));
    setPersistence({
      phase: "synced",
      error: null,
      revision,
      hasCloudRecord,
      legacyMigrated,
      remoteConflict: null,
    });
    emit();
    return true;
  } catch (error) {
    if (error instanceof CloudConflictError) {
      applyRemote(error.latest);
      remoteConflict = error.latest.data;
      setPersistence({
        phase: "conflict",
        error: "Cloud data changed during migration. Your browser data is still untouched.",
        revision,
        hasCloudRecord,
        legacyMigrated,
        remoteConflict,
      });
    } else {
      setPersistence({ phase: "error", error: errorMessage(error) });
    }
    return false;
  }
}
