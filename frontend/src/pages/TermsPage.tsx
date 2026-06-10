import { MarketingLayout } from "@/components/MarketingLayout"
import { MarketingSection } from "@/components/marketing/MarketingSection"

export function TermsPage() {
  return (
    <MarketingLayout>
      <MarketingSection className="pt-12 sm:pt-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: June 2026</p>

          <div className="prose prose-neutral mt-10 max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="text-base font-semibold text-foreground">Service</h2>
              <p>
                ECHO provides portfolio intelligence tools for wealth advisors. The platform
                analyzes uploaded account statements and presents informational analytics for
                advisor workflows.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-foreground">Not investment advice</h2>
              <p>
                ECHO does not provide investment, legal, or tax advice. Outputs are for
                informational purposes only. Advisors remain responsible for client
                recommendations and compliance obligations.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-foreground">Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account
                credentials and for activity under your account.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-foreground">Contact</h2>
              <p>
                Questions about these terms can be submitted through the demo request form on
                this site.
              </p>
            </section>
          </div>
        </div>
      </MarketingSection>
    </MarketingLayout>
  )
}
