import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TwoColumnLayoutProps {
  left: ReactNode
  right: ReactNode
  leftWidth?: "1/3" | "2/3" | "1/2"
  rightWidth?: "1/3" | "2/3" | "1/2"
  gap?: "sm" | "md" | "lg"
  className?: string
}

export function TwoColumnLayout({
  left,
  right,
  leftWidth = "2/3",
  rightWidth = "1/3",
  gap = "md",
  className,
}: TwoColumnLayoutProps) {
  const gapClass = {
    sm: "gap-4",
    md: "gap-5 lg:gap-6",
    lg: "gap-6 lg:gap-8",
  }[gap]

  const leftWidthClass = {
    "1/3": "md:w-1/3",
    "2/3": "md:w-2/3",
    "1/2": "md:w-1/2",
  }[leftWidth]

  const rightWidthClass = {
    "1/3": "md:w-1/3",
    "2/3": "md:w-2/3",
    "1/2": "md:w-1/2",
  }[rightWidth]

  return (
    <div className={cn("flex flex-col md:flex-row", gapClass, className)}>
      <div className={cn("w-full", leftWidthClass)}>{left}</div>
      <div className={cn("w-full", rightWidthClass)}>{right}</div>
    </div>
  )
}
