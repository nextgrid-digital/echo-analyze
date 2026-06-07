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
    <div className="dashboard-section-header mb-6 sm:mb-7">
      <div className="flex items-start gap-4">
        {index !== undefined && (
          <div className="relative shrink-0">
            <span
              className={cn(
                "relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-bold tabular-nums",
                styles.sectionBadge
              )}
            >
              {String(index).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "absolute inset-0 rounded-2xl blur-md opacity-60",
                styles.sectionGlow
              )}
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={cn(
                "h-9 w-1.5 shrink-0 rounded-full bg-gradient-to-b shadow-sm",
                styles.sectionGradient
              )}
            />
            <h2 className="text-section-header font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {title}
            </h2>
          </div>
          <p className="mt-2 pl-[1.375rem] text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
      <div className="relative mt-5 h-px overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r opacity-80",
            styles.sectionGradient
          )}
        />
      </div>
    </div>
  )
}
