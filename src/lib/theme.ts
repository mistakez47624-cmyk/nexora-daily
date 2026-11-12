
import { useSyncExternalStore } from "react";
import type { Theme } from "./types";

export const THEME_KEY = "nexora:theme";
export const ACCENT_KEY = "nexora:accent";

export type Accent =
  | "violet"
  | "blue"
  | "cyan"
  | "pink"
  | "rose"
  | "green"
  | "orange"
  | "amber";

export const ACCENTS: { value: Accent; label: string; color: string }[] = [
  { value: "violet", label: "Violet", color: "#8B5CF6" },
  { value: "blue", label: "Blue", color: "#3B82F6" },
  { value: "cyan", label: "Cyan", color: "#06B6D4" },
  { value: "pink", label: "Pink", color: "#EC4899" },
  { value: "rose", label: "Rose", color: "#F43F5E" },
  { value: "green", label: "Green", color: "#22C55E" },
  { value: "orange", label: "Orange", color: "#F97316" },
  { value: "amber", label: "Amber", color: "#EAB308" },
];

export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='light')document.documentElement.classList.remove('dark');var a=localStorage.getItem('${ACCENT_KEY}');if(['violet','blue','cyan','pink','rose','green','orange','amber'].includes(a))document.documentElement.dataset.accent=a}catch(e){}`;

const listeners = new Set<() => void>();
const accentListeners = new Set<() => void>();

function read(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* preference simply won't persist */
  }
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => "dark",
  );
}

function readAccent(): Accent {
  const value = document.documentElement.dataset.accent;
  return ACCENTS.some((a) => a.value === value)
    ? (value as Accent)
    : "violet";
}

export function setAccent(accent: Accent) {
  document.documentElement.dataset.accent = accent;
  try {
    window.localStorage.setItem(ACCENT_KEY, accent);
  } catch {
    /* preference simply won't persist */
  }
  accentListeners.forEach((l) => l());
}

export function useAccent(): Accent {
  return useSyncExternalStore(
    (l) => {
      accentListeners.add(l);
      return () => accentListeners.delete(l);
    },
    readAccent,
    () => "violet",
  );
}
