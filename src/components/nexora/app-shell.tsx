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
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur md:px-4">
          <SidebarTrigger
            aria-label="Toggle sidebar"
            className="size-9 text-muted-foreground hover:text-foreground"
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
