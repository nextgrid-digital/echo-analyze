import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface WideCardProps {
  children: ReactNode
  className?: string
}

export function WideCard({ children, className }: WideCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border/50 rounded-none p-5 sm:p-6 transition-all duration-200",
        className
      )}
    >
      {children}
    </div>
  )
}
