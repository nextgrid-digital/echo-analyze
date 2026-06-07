import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface CompactCardProps {
  children: ReactNode
  className?: string
  accent?: string
  variant?: "default" | "hero"
}

export function CompactCard({
  children,
  className,
  variant = "default",
}: CompactCardProps) {
  const isHero = variant === "hero"

  return (
    <div
      className={cn(
        "dashboard-kpi-card group relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300",
        isHero
          ? "border-slate-700 bg-slate-900 p-6 shadow-lg sm:p-8"
          : "border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md dark:border-slate-700 dark:bg-slate-900/90 sm:p-5",
        className
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-0.5", isHero ? "bg-teal-500" : "bg-teal-600/80")} />
      <div className="relative">{children}</div>
    </div>
  )
}
