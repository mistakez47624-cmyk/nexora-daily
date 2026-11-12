import * as React from "react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useHydrated } from "@tanstack/react-router";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSidebar } from "./app-sidebar";
import { Wordmark } from "./wordmark";

const SIDEBAR_KEY = "nexora:sidebar-open";

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_KEY) === "false") setOpen(false);
    } catch {
      /* ignore */
    }
  }, []);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    try {
      window.localStorage.setItem(SIDEBAR_KEY, String(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <SidebarProvider open={open} onOpenChange={onOpenChange}>
      {/* Animated Midnight Violet ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] animate-[blobFloat_18s_ease-in-out_infinite] rounded-full bg-violet-600/35 blur-[120px]" />
        <div className="absolute -right-40 top-[20%] h-[480px] w-[480px] animate-[blobFloat_22s_ease-in-out_infinite_reverse] rounded-full bg-indigo-500/30 blur-[130px]" />
        <div className="absolute -bottom-48 left-[25%] h-[520px] w-[520px] animate-[blobFloat_25s_ease-in-out_infinite] rounded-full bg-purple-500/25 blur-[140px]" />
      </div>

      <AppSidebar />

      <SidebarInset className="relative z-10 min-w-0 bg-transparent">
       <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-black/5 bg-[#F5F1FF]/35 px-3 backdrop-blur-2xl dark:border-white/10 dark:bg-[#100D1C]/35 md:px-4">
          <SidebarTrigger
            aria-label="Toggle sidebar"
            className="size-9 rounded-xl text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground"
          />
          <Link to="/" className="rounded-md md:hidden" aria-label="NEXORA home">
            <Wordmark />
          </Link>
        </header>

        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          {hydrated ? children : <ShellSkeleton />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ShellSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}