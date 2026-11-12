export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  /** Local calendar date, yyyy-MM-dd */
  dueDate: string | null;
  priority: Priority;
  completed: boolean;
  /** ISO timestamp */
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type InboxCategory = "task" | "note" | "idea";

export interface InboxItem {
  id: string;
  content: string;
  category: InboxCategory;
  processed: boolean;
  createdAt: string;
  processedAt: string | null;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  /** Days of week the routine is scheduled on, 0 = Sunday … 6 = Saturday */
  days: number[];
  /** Local calendar dates (yyyy-MM-dd) the routine was completed */
  completions: string[];
  createdAt: string;
}

export interface Profile {
  name: string;
}

export const MAIL_PROVIDER_IDS = [
  "gmail",
  "outlook",
  "microsoft365",
  "yahoo",
  "icloud",
  "proton",
  "fastmail",
  "zoho",
  "aol",
  "gmx",
  "yandex",
  "tuta",
  "mailcom",
  "other",
] as const;

export type MailProviderId = (typeof MAIL_PROVIDER_IDS)[number];

export interface MailAccount {
  id: string;
  provider: MailProviderId;
  email: string;
  connectedAt: string;
}

export interface SentMessage {
  id: string;
  accountId: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

export interface AppData {
  version: 1;
  tasks: Task[];
  notes: Note[];
  inbox: InboxItem[];
  routines: Routine[];
  profile: Profile;
  mailAccounts: MailAccount[];
  sentMail: SentMessage[];
}

export type Theme = "dark" | "light";
