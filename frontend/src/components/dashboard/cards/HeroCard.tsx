import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface HeroCardProps {
  children: ReactNode
  className?: string
}

export function HeroCard({ children, className }: HeroCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border/50 rounded-none p-6 sm:p-8 transition-all duration-200",
        className
      )}
    >
      {children}
    </div>
  )
}
