import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const progressVariants = cva(
  "relative w-full overflow-hidden rounded-full",
  {
    variants: {
      variant: {
        default: "bg-primary/20 h-2",
        pill: "bg-primary/10 h-8",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root>, VariantProps<typeof progressVariants> {
  showLabel?: boolean
}

function Progress({
  className,
  value,
  variant = "default",
  showLabel = false,
  ...props
}: ProgressProps) {
  const progressValue = value || 0
  
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(progressVariants({ variant }), className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full flex-1 transition-all duration-300 ease-out",
          variant === "pill" 
            ? "bg-primary rounded-full" 
            : "bg-primary"
        )}
        style={{ transform: `translateX(-${100 - progressValue}%)` }}
      />
      {variant === "pill" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-bold text-foreground drop-shadow-sm">
            {Math.round(progressValue)}%
          </span>
        </div>
      )}
    </ProgressPrimitive.Root>
  )
}

export { Progress }
