import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Info } from "lucide-react"

interface SectionInfoTooltipProps {
  /** Title shown in bold at the top of the tooltip */
  title?: string
  /** Body content: what the card shows and how it's calculated */
  content: React.ReactNode
  /** Optional side for the tooltip popover (default: "left" so it opens left of the icon at top-right) */
  side?: "top" | "right" | "bottom" | "left"
  /** Optional class for the trigger button */
  className?: string
}

export function SectionInfoTooltip({
  title,
  content,
  side = "left",
  className,
}: SectionInfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="What this section shows and how it's calculated"
          className={cn(
            "h-8 w-8 rounded-full text-foreground/70 hover:text-foreground hover:bg-muted/50",
            className
          )}
        >
          <Info className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={8}
        className="max-w-[320px] bg-popover text-popover-foreground text-left text-sm leading-relaxed shadow-lg border border-border"
      >
        {title && (
          <p className="font-semibold text-foreground mb-1.5">{title}</p>
        )}
        <div className="text-muted-foreground">{content}</div>
      </TooltipContent>
    </Tooltip>
  )
}

