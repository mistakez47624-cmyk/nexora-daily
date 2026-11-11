import { z } from "zod";
import type { AppData } from "./types";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const iso = z.string().min(1);

const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).default(""),
  dueDate: dateKey.nullable().default(null),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  completed: z.boolean().default(false),
  completedAt: iso.nullable().default(null),
  createdAt: iso,
  updatedAt: iso,
});

const noteSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(200).default(""),
  content: z.string().max(100000).default(""),
  tags: z.array(z.string().max(32)).default([]),
  createdAt: iso,
  updatedAt: iso,
});

const inboxSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1).max(1000),
  category: z.enum(["task", "note", "idea"]).default("idea"),
  processed: z.boolean().default(false),
  createdAt: iso,
  processedAt: iso.nullable().default(null),
});

const routineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(500).default(""),
  days: z.array(z.number().int().min(0).max(6)).min(1),
  completions: z.array(dateKey).default([]),
  createdAt: iso,
});

export const appDataSchema = z.object({
  version: z.literal(1).default(1),
  tasks: z.array(taskSchema).default([]),
  notes: z.array(noteSchema).default([]),
  inbox: z.array(inboxSchema).default([]),
  routines: z.array(routineSchema).default([]),
  profile: z.object({ name: z.string().max(40).default("") }).default({ name: "" }),
});

export function emptyData(): AppData {
  return { version: 1, tasks: [], notes: [], inbox: [], routines: [], profile: { name: "" } };
}

export function parseAppData(input: unknown): AppData {
  return appDataSchema.parse(input) as AppData;
}

/* Form validation */
export const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Give the task a title").max(200, "Keep the title under 200 characters"),
  description: z.string().max(5000, "Description is too long"),
  dueDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date"),
  priority: z.enum(["low", "medium", "high"]),
});

export const routineFormSchema = z.object({
  name: z.string().trim().min(1, "Give the routine a name").max(80, "Keep the name under 80 characters"),
  description: z.string().max(500, "Description is too long"),
  days: z.array(z.number()).min(1, "Pick at least one day"),
});

export const captureSchema = z
  .string()
  .trim()
  .min(1, "Write something to capture")
  .max(1000, "Keep captures under 1000 characters");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter a display name")
  .max(40, "Keep your name under 40 characters");
