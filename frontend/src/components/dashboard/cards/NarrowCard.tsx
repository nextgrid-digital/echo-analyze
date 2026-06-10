import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface NarrowCardProps {
  children: ReactNode
  className?: string
  accent?: string
}

export function NarrowCard({ children, className }: NarrowCardProps) {
  return (
    <Card
      className={cn(
        "dashboard-content-card relative gap-4 overflow-hidden border-t-2 border-t-primary p-5 sm:p-6",
        className
      )}
    >
      {children}
    </Card>
  )
}
