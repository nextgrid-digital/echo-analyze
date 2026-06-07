import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface WideCardProps {
  children: ReactNode
  className?: string
  accent?: string
}

export function WideCard({ children, className }: WideCardProps) {
  return (
    <div
      className={cn(
        "dashboard-content-card relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/90 sm:p-6",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-teal-600/80" />
      <div className="relative">{children}</div>
    </div>
  )
}
