import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
          <Badge
            variant="secondary"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-0",
              "bg-foreground text-xs font-bold tabular-nums text-primary"
            )}
          >
            {String(index).padStart(2, "0")}
          </Badge>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-8 w-1 shrink-0 rounded-full bg-primary" />
            <h2 className="text-section-header font-bold tracking-tight text-foreground">
              {title}
            </h2>
          </div>
          <p className="mt-2 pl-4 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="relative mt-5">
        <Separator />
        <div className="absolute inset-y-0 left-0 w-24 rounded-full bg-primary/80" />
      </div>
    </div>
  )
}
