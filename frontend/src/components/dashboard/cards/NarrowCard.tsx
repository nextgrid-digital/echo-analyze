import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface NarrowCardProps {
  children: ReactNode
  className?: string
  accent?: string
}

export function NarrowCard({ children, className }: NarrowCardProps) {
  return (
    <div
      className={cn(
        "dashboard-content-card relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/90 sm:p-5",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-teal-600/80" />
      <div className="relative">{children}</div>
    </div>
  )
}
