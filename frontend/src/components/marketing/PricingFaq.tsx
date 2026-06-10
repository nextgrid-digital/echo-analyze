import { ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { SectionHeading } from "./MarketingSection"

const FAQ_ITEMS = [
  {
    question: "Can I try Echo before subscribing?",
    answer:
      "Yes. Every account includes one client portfolio at no cost. No credit card required.",
  },
  {
    question: "What does Unlimited include?",
    answer:
      "Unlimited lets you analyze as many client portfolios as your practice needs, with full workspace access each time.",
  },
  {
    question: "Who is Echo for?",
    answer:
      "Echo is built for wealth advisors and advisory teams who prepare regular client portfolio reviews.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel through Razorpay. Access continues until the end of your billing period.",
  },
] as const

export function PricingFaq() {
  return (
    <div className="mt-16 border-t border-border pt-16">
      <SectionHeading
        eyebrow="FAQ"
        title="Common questions"
        description="What advisors ask before getting started."
        align="center"
      />
      <div className="mx-auto max-w-2xl divide-y divide-border border border-border rounded-xl overflow-hidden">
        {FAQ_ITEMS.map((item) => (
          <Collapsible key={item.question}>
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40">
              <span className="font-medium">{item.question}</span>
              <ChevronDown className="h-4 w-4 flex-none text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}
