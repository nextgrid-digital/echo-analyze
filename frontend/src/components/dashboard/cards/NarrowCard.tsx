import type { ReactNode } from "react"
import type { DashboardAccent } from "@/lib/dashboardTheme"
import { DASHBOARD_ACCENT_STYLES } from "@/lib/dashboardTheme"
import { cn } from "@/lib/utils"

interface NarrowCardProps {
  children: ReactNode
  className?: string
  accent?: DashboardAccent
}

export function NarrowCard({ children, className, accent }: NarrowCardProps) {
  const accentStyles = accent ? DASHBOARD_ACCENT_STYLES[accent] : null

  return (
    <div
      className={cn(
        "rounded-none border border-border/50 bg-card p-4 shadow-sm transition-all duration-200 sm:p-5",
        accentStyles?.topBorder && "border-t-[3px]",
        accentStyles?.topBorder,
        accentStyles?.surface,
        className
      )}
    >
      {children}
    </div>
  )
}