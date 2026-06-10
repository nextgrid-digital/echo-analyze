import { DemoRequestForm } from "@/components/marketing/DemoRequestForm"
import { MarketingLayout } from "@/components/MarketingLayout"

export function DemoPage() {
  return (
    <MarketingLayout>
      <section className="marketing-hero-linear px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-lg">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Book a demo</h1>
            <p className="mt-3 text-base text-muted-foreground">
              See how Echo helps advisory teams prepare better client reviews.
            </p>
          </div>
          <div className="mt-10 rounded-xl border border-border bg-card p-6 shadow-apple sm:p-8">
            <DemoRequestForm />
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
