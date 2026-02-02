import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
        <button
          type="button"
          aria-label="What this section shows and how it's calculated"
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 min-[44px]:size-[44px]",
            className
          )}
        >
          <Info className="size-4 min-[44px]:size-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={8}
        className="max-w-[320px] bg-slate-900 text-slate-100 text-left text-sm leading-relaxed shadow-lg"
      >
        {title && (
          <p className="font-semibold text-white mb-1.5">{title}</p>
        )}
        <div className="text-slate-300">{content}</div>
      </TooltipContent>
    </Tooltip>
  )
}

