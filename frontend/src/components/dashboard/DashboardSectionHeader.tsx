import type { DashboardAccent } from "@/lib/dashboardTheme"
import { DASHBOARD_ACCENT_STYLES } from "@/lib/dashboardTheme"
import { cn } from "@/lib/utils"

interface DashboardSectionHeaderProps {
  title: string
  description: string
  accent: DashboardAccent
  index?: number
}

export function DashboardSectionHeader({
  title,
  description,
  accent,
  index,
}: DashboardSectionHeaderProps) {
  const styles = DASHBOARD_ACCENT_STYLES[accent]

  return (
    <div className="dashboard-section-header mb-5 sm:mb-6">
      <div className="flex items-center gap-3 sm:gap-4">
        {index !== undefined && (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums",
              styles.sectionBadge
            )}
          >
            {String(index).padStart(2, "0")}
          </span>
        )}
        <div className={cn("h-8 w-1 shrink-0 rounded-full", styles.sectionBar)} />
        <div className="min-w-0 flex-1">
          <h2 className="text-section-header text-slate-900">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-4 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
    </div>
  )
}
