import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ThreeColumnLayoutProps {
  left: ReactNode
  middle: ReactNode
  right: ReactNode
  gap?: "sm" | "md" | "lg"
  className?: string
}

export function ThreeColumnLayout({
  left,
  middle,
  right,
  gap = "md",
  className,
}: ThreeColumnLayoutProps) {
  const gapClass = {
    sm: "gap-4",
    md: "gap-4 sm:gap-5",
    lg: "gap-5 lg:gap-6",
  }[gap]

  return (
    <div className={cn("flex flex-col lg:flex-row", gapClass, className)}>
      <div className="w-full lg:w-1/2">{left}</div>
      <div className="w-full lg:w-1/4">{middle}</div>
      <div className="w-full lg:w-1/4">{right}</div>
    </div>
  )
}
