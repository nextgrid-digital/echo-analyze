import { cn } from "@/lib/utils"

interface ProgressBarWithLabelProps {
  value: number
  max?: number
  label: string
  valueLabel?: string
  color?: string
  height?: "sm" | "md" | "lg"
  showValue?: boolean
  className?: string
}

export function ProgressBarWithLabel({
  value,
  max = 100,
  label,
  valueLabel,
  color = "#059669",
  height = "md",
  showValue = true,
  className,
}: ProgressBarWithLabelProps) {
  const percentage = Math.min((value / max) * 100, 100)
  const heightClass = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  }[height]

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        {showValue && (
          <span className="text-sm font-semibold text-foreground">
            {valueLabel ?? `${value.toFixed(1)}%`}
          </span>
        )}
      </div>
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", heightClass)}>
        <div
          className="h-full transition-all duration-500 rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}
