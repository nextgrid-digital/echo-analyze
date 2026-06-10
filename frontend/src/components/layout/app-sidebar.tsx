import type { ComponentType } from "react"
import { Link, useLocation } from "react-router-dom"
import { EchoLogo } from "@/components/EchoLogo"
import { Icons } from "@/components/icons"
import { useAuth } from "@/auth/useAuth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { navGroups, type NavIcon } from "@/config/nav-config"

const iconMap: Record<NavIcon, ComponentType<{ className?: string }>> = {
  home: Icons.dashboard,
  clients: Icons.teams,
  logo: Icons.logo,
}

function AdvisorProfile() {
  const { user } = useAuth()
  const name =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Advisor"
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex items-center gap-2 px-1 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
        <p className="truncate font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">Wealth Advisor</p>
      </div>
    </div>
  )
}

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible="icon" variant="inset" className="no-print pt-0">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Link to="/dashboard">
                <EchoLogo className="size-8" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">ECHO</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Advisor Copilot
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = iconMap[item.icon]
                const isActive =
                  pathname === item.url ||
                  (item.url === "/dashboard" &&
                    pathname.startsWith("/dashboard") &&
                    pathname !== "/dashboard/report") ||
                  (item.url === "/clients" && pathname.startsWith("/clients/"))

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.url}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-3 p-2">
        <AdvisorProfile />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
