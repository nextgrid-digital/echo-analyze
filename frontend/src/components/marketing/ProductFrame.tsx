import type { ReactNode } from "react"
import { MarketingPreviewViewport } from "./MarketingPreviewViewport"

interface ProductFrameProps {
  children: ReactNode
  title?: string
  className?: string
  scale?: "sm" | "md" | "lg"
}

/** @deprecated Use MarketingPreviewViewport */
export function ProductFrame({
  children,
  title = "ECHO",
  className,
}: ProductFrameProps) {
  return (
    <MarketingPreviewViewport title={title} className={className}>
      {children}
    </MarketingPreviewViewport>
  )
}
