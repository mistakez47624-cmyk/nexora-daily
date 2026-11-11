import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CheckSquare,
  Inbox,
  LayoutDashboard,
  Moon,
  Repeat,
  Settings,
  StickyNote,
  Sun,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAppData } from "@/lib/store";
import { setTheme, useTheme } from "@/lib/theme";
import { Wordmark } from "./wordmark";
import { initials } from "@/lib/utils";

const NAV = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard },
  { title: "Inbox", to: "/inbox", icon: Inbox },
  { title: "Tasks", to: "/tasks", icon: CheckSquare },
  { title: "Notes", to: "/notes", icon: StickyNote },
  { title: "Routines", to: "/routines", icon: Repeat },
  { title: "Analytics", to: "/analytics", icon: BarChart3 },
  { title: "Settings", to: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { setOpenMobile, isMobile } = useSidebar();
  const data = useAppData();
  const theme = useTheme();
  const unprocessed = data.inbox.filter((i) => !i.processed).length;
  const name = data.profile.name || "Guest";

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-3 group-data-[collapsible=icon]:px-2">
        <Link
          to="/"
          onClick={closeOnMobile}
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Wordmark />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {NAV.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.title}>
                    <Link to={item.to} onClick={closeOnMobile}>
                      <item.icon strokeWidth={1.75} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.to === "/inbox" && unprocessed > 0 && (
                    <SidebarMenuBadge className="text-muted-foreground">
                      {unprocessed}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun strokeWidth={1.75} /> : <Moon strokeWidth={1.75} />}
              <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Profile settings">
              <Link to="/settings" onClick={closeOnMobile}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
                  {initials(name)}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">Edit profile</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
