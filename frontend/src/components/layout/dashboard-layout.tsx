import type { ReactNode } from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { AppSidebar } from "./app-sidebar"
import { Header } from "./header"
import { PageContainer } from "./page-container"

interface DashboardLayoutProps {
  headerActions?: ReactNode
  children: ReactNode
  captureRef?: React.RefObject<HTMLDivElement | null>
  captureId?: string
  banner?: ReactNode
  scrollable?: boolean
}

export function DashboardLayout({
  headerActions,
  children,
  captureRef,
  captureId,
  banner,
  scrollable = true,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider
      defaultOpen
      className={scrollable ? "h-svh overflow-hidden" : undefined}
    >
      <AppSidebar />
      <SidebarInset
        className={cn(
          scrollable ? "min-h-0 overflow-hidden" : undefined,
          "md:peer-data-[variant=inset]:mt-0 md:peer-data-[variant=inset]:rounded-t-none"
        )}
      >
        <div
          ref={captureRef}
          id={captureId}
          className={cn(
            "dashboard-page flex flex-col bg-background",
            scrollable ? "h-full min-h-0 overflow-hidden" : "min-h-svh"
          )}
        >
          {banner}
          <Header actions={headerActions} />
          <PageContainer scrollable={scrollable}>{children}</PageContainer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
