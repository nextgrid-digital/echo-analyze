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
      <div className="flex items-start gap-3 sm:gap-4">
        {index !== undefined && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold tabular-nums",
              styles.sectionBadge
            )}
          >
            {String(index).padStart(2, "0")}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-8 w-1.5 shrink-0 rounded-full bg-gradient-to-b",
                styles.sectionGradient
              )}
            />
            <h2 className="text-section-header bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {title}
            </h2>
          </div>
          <p className="mt-1.5 pl-[1.125rem] text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div
        className={cn(
          "mt-4 h-px bg-gradient-to-r via-transparent to-transparent opacity-60",
          styles.sectionGradient
        )}
      />
    </div>
  )
}
