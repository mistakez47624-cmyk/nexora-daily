import { useSyncExternalStore } from "react";
import type { Theme } from "./types";

export const THEME_KEY = "nexora:theme";

/** Runs before first paint (inlined in the document head) to avoid a theme flash. */
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='light')document.documentElement.classList.remove('dark')}catch(e){}`;

const listeners = new Set<() => void>();

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
