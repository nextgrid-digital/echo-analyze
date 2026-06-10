import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Step {
  step: string
  title: string
  description: string
}

interface StepFlowProps {
  steps: readonly Step[]
}

export function StepFlow({ steps }: StepFlowProps) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-start md:gap-4">
      {steps.map((item, index) => (
        <div key={item.step} className="contents">
          <Card
            className={cn(
              "border-t-[3px] border-t-primary py-5 transition-all hover:shadow-md"
            )}
          >
            <CardHeader className="gap-3 px-5">
              <Badge className="h-10 w-10 justify-center rounded-lg p-0 font-mono text-sm">
                {item.step}
              </Badge>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription className="leading-relaxed">
                {item.description}
              </CardDescription>
            </CardHeader>
          </Card>
          {index < steps.length - 1 && (
            <div className="hidden items-center justify-center pt-14 md:flex">
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
