import type { ReactNode } from "react"
import type { DashboardAccent } from "@/lib/dashboardTheme"
import { DASHBOARD_ACCENT_STYLES } from "@/lib/dashboardTheme"
import { cn } from "@/lib/utils"

interface WideCardProps {
  children: ReactNode
  className?: string
  accent?: DashboardAccent
}

export function WideCard({ children, className, accent }: WideCardProps) {
  const accentStyles = accent ? DASHBOARD_ACCENT_STYLES[accent] : null

  return (
    <div
      className={cn(
        "dashboard-card rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-6",
        accentStyles?.leftBorder && "border-l-[3px]",
        accentStyles?.leftBorder,
        accentStyles?.surface,
        className
      )}
    >
      {children}
    </div>
  )
}
