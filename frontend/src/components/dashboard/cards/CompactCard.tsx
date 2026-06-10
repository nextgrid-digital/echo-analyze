import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"
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
    <Card
      className={cn(
        "dashboard-kpi-card relative gap-4 overflow-hidden border-t-2 border-t-primary p-5 sm:p-6",
        isHero && "border-foreground/20 bg-foreground text-background",
        className
      )}
    >
      {children}
    </Card>
  )
}
