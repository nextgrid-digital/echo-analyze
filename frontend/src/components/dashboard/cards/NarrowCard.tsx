import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface NarrowCardProps {
  children: ReactNode
  className?: string
}

export function NarrowCard({ children, className }: NarrowCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border/50 rounded-none p-4 sm:p-5 transition-all duration-200",
        className
      )}
    >
      {children}
    </div>
  )
}
