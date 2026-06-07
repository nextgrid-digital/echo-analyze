import { ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { SectionHeading } from "./MarketingSection"

const FAQ_ITEMS = [
  {
    question: "What is a CAS file?",
    answer:
      "A Consolidated Account Statement (CAS) is a single document from CAMS or KFintech that lists all your mutual fund holdings across fund houses.",
  },
  {
    question: "Is my first report really free?",
    answer:
      "Yes. Every account gets one free CAS analysis. No credit card is required to try ECHO.",
  },
  {
    question: "What does the Unlimited plan include?",
    answer:
      "Unlimited lets you analyze as many CAS reports as you need while signed in to the same account, with full dashboard access each time.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. You can cancel your subscription through Razorpay. Access continues until the end of your current billing period.",
  },
] as const

export function PricingFaq() {
  return (
    <div className="mt-16 border-t border-border pt-16">
      <SectionHeading
        eyebrow="FAQ"
        title="Common questions"
        description="Everything you need to know before uploading your first CAS."
        align="center"
      />
      <div className="mx-auto max-w-2xl divide-y divide-border border border-border">
        {FAQ_ITEMS.map((item) => (
          <Collapsible key={item.question}>
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-violet-50/60">
              <span className="font-medium">{item.question}</span>
              <ChevronDown className="h-4 w-4 flex-none text-violet-500 transition-transform group-data-[state=open]:rotate-180" />
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
