import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface CompactCardProps {
  children: ReactNode
  className?: string
}

export function CompactCard({ children, className }: CompactCardProps) {
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
