import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FullWidthSectionProps {
  children: ReactNode
  className?: string
}

export function FullWidthSection({ children, className }: FullWidthSectionProps) {
  return (
    <div className={cn("w-full", className)}>
      {children}
    </div>
  )
}
