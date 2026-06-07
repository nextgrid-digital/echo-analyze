import type { DashboardAccent } from "@/lib/dashboardTheme"
import { cn } from "@/lib/utils"

interface DashboardSectionHeaderProps {
  title: string
  description: string
  accent?: DashboardAccent
  index?: number
}

export function DashboardSectionHeader({
  title,
  description,
  index,
}: DashboardSectionHeaderProps) {
  return (
    <div className="dashboard-section-header mb-6 sm:mb-7">
      <div className="flex items-start gap-4">
        {index !== undefined && (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              "bg-slate-900 text-xs font-bold tabular-nums text-teal-300",
              "ring-1 ring-teal-500/25 dark:bg-slate-950"
            )}
          >
            {String(index).padStart(2, "0")}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-8 w-1 shrink-0 rounded-full bg-teal-600" />
            <h2 className="text-section-header font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {title}
            </h2>
          </div>
          <p className="mt-2 pl-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
      <div className="relative mt-5 h-px overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
        <div className="absolute inset-y-0 left-0 w-24 rounded-full bg-teal-600/80" />
      </div>
    </div>
  )
}
