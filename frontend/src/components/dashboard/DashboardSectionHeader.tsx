import type { DashboardAccent } from "@/lib/dashboardTheme"
import { DASHBOARD_ACCENT_STYLES } from "@/lib/dashboardTheme"
import { cn } from "@/lib/utils"

interface DashboardSectionHeaderProps {
  title: string
  description: string
  accent: DashboardAccent
}

export function DashboardSectionHeader({
  title,
  description,
  accent,
}: DashboardSectionHeaderProps) {
  const styles = DASHBOARD_ACCENT_STYLES[accent]

  return (
    <div className="mb-4 flex items-start gap-4 sm:mb-6">
      <div className={cn("mt-1 h-10 w-1.5 shrink-0 rounded-full", styles.sectionBar)} />
      <div>
        <h2 className="text-section-header text-foreground mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
