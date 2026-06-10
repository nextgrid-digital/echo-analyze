import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: ReactNode
  className?: string
  scrollable?: boolean
}

export function PageContainer({
  children,
  className,
  scrollable = true,
}: PageContainerProps) {
  const content = (
    <div className={cn("flex flex-1 flex-col gap-4 p-4 pt-0 md:gap-6 md:p-6", className)}>
      {children}
    </div>
  )

  if (!scrollable) {
    return content
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {content}
    </div>
  )
}
