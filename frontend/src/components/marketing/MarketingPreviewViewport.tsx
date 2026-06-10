import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface MarketingPreviewViewportProps {
  children: ReactNode
  title?: string
  className?: string
  /** CSS aspect-ratio value, e.g. "16 / 9" */
  aspectRatio?: string
  canvasWidth?: number
  showChrome?: boolean
}

export function MarketingPreviewViewport({
  children,
  title = "ECHO",
  className,
  aspectRatio = "16 / 10",
  canvasWidth = 1280,
  showChrome = true,
}: MarketingPreviewViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [scaledHeight, setScaledHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const updateScale = () => {
      const width = container.clientWidth
      if (width <= 0) return

      const nextScale = width / canvasWidth
      setScale(nextScale)
      setScaledHeight(canvas.offsetHeight * nextScale)
    }

    updateScale()

    const observer = new ResizeObserver(updateScale)
    observer.observe(container)

    const contentObserver = new ResizeObserver(updateScale)
    contentObserver.observe(canvas)

    return () => {
      observer.disconnect()
      contentObserver.disconnect()
    }
  }, [canvasWidth])

  return (
    <div
      ref={containerRef}
      className={cn(
        "marketing-dashboard-preview pointer-events-none relative w-full min-w-0 select-none overflow-hidden rounded-xl border border-border bg-card shadow-apple",
        className
      )}
      style={{
        aspectRatio: scaledHeight == null ? aspectRatio : undefined,
        height: scaledHeight != null ? scaledHeight + (showChrome ? 40 : 0) : undefined,
      }}
    >
      {showChrome && (
        <div className="flex h-10 items-center gap-2 border-b border-border bg-muted/40 px-4">
          <span className="h-2 w-2 rounded-full bg-foreground/15" />
          <span className="h-2 w-2 rounded-full bg-foreground/15" />
          <span className="h-2 w-2 rounded-full bg-foreground/15" />
          <span className="ml-2 text-xs font-medium text-muted-foreground">{title}</span>
        </div>
      )}
      <div
        className="relative overflow-hidden"
        style={{ height: scaledHeight != null ? scaledHeight : undefined }}
      >
        <div
          ref={canvasRef}
          className="origin-top-left"
          style={{
            width: canvasWidth,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
