import { cn } from "@/lib/utils"

interface Segment {
  value: number
  color: string
  label?: string
}

interface SegmentedBarProps {
  segments: Segment[]
  total?: number
  height?: "sm" | "md" | "lg"
  showLabels?: boolean
  className?: string
}

export function SegmentedBar({
  segments,
  total,
  height = "md",
  showLabels = false,
  className,
}: SegmentedBarProps) {
  const totalValue = total ?? segments.reduce((sum, seg) => sum + seg.value, 0)
  const heightClass = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  }[height]

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full rounded-full overflow-hidden flex", heightClass)}>
        {segments.map((segment, index) => {
          const percentage = totalValue > 0 ? (segment.value / totalValue) * 100 : 0
          return (
            <div
              key={index}
              className="transition-all duration-300"
              style={{
                width: `${percentage}%`,
                backgroundColor: segment.color,
              }}
              title={segment.label}
            />
          )
        })}
      </div>
      {showLabels && (
        <div className="flex flex-wrap gap-4 mt-2 text-xs">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: segment.color }}
              />
              {segment.label && (
                <span className="text-muted-foreground">{segment.label}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
