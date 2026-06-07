import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  step: string
  title: string
  description: string
}

interface StepFlowProps {
  steps: readonly Step[]
}

const STEP_ACCENTS = [
  "border-t-emerald-500 bg-emerald-50/50",
  "border-t-sky-500 bg-sky-50/50",
  "border-t-violet-500 bg-violet-50/50",
] as const

const STEP_BADGES = [
  "bg-emerald-500 text-white",
  "bg-sky-500 text-white",
  "bg-violet-500 text-white",
] as const

export function StepFlow({ steps }: StepFlowProps) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-start md:gap-4">
      {steps.map((item, index) => (
        <div key={item.step} className="contents">
          <div
            className={cn(
              "group relative border border-border border-t-[3px] bg-background p-6 transition-all hover:shadow-apple",
              STEP_ACCENTS[index % STEP_ACCENTS.length]
            )}
          >
            <div
              className={cn(
                "mb-4 flex h-10 w-10 items-center justify-center font-mono text-sm font-semibold",
                STEP_BADGES[index % STEP_BADGES.length]
              )}
            >
              {item.step}
            </div>
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div className="hidden items-center justify-center pt-14 md:flex">
              <ArrowRight className="h-5 w-5 text-sky-500" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
