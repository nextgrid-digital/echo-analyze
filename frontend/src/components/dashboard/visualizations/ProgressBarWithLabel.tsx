import { Progress } from "@/components/ui/progress"
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
  color,
  height = "md",
  showValue = true,
  className,
}: ProgressBarWithLabelProps) {
  const safeValue = Number.isFinite(value) ? value : 0
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100
  const percentage = Math.min(Math.max((safeValue / safeMax) * 100, 0), 100)
  const heightClass = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  }[height]

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {showValue && (
          <span className="ml-auto text-sm font-semibold tabular-nums text-foreground">
            {valueLabel ?? `${safeValue.toFixed(1)}%`}
          </span>
        )}
      </div>
      <Progress
        value={percentage}
        className={heightClass}
        style={
          color
            ? ({
                ["--primary" as string]: color,
              } as React.CSSProperties)
            : undefined
        }
      />
    </div>
  )
}
