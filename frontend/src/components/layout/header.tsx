import type { ReactNode } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ThemeSelector } from "@/components/themes/theme-selector"
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle"
import { NotificationCenter } from "@/features/notifications/components/notification-center"
import { UserNav } from "./user-nav"

interface HeaderProps {
  actions?: ReactNode
}

export function Header({ actions }: HeaderProps) {
  return (
    <header className="no-print sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 hidden h-4 sm:block" />
        <Breadcrumbs />
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <NotificationCenter />
          <ThemeSelector />
          <ThemeModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  )
}
