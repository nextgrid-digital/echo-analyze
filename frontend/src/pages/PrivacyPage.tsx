import { MarketingLayout } from "@/components/MarketingLayout"
import { MarketingSection } from "@/components/marketing/MarketingSection"

export function PrivacyPage() {
  return (
    <MarketingLayout>
      <MarketingSection className="pt-12 sm:pt-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: June 2026</p>

          <div className="prose prose-neutral mt-10 max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="text-base font-semibold text-foreground">Data we process</h2>
              <p>
                ECHO processes account information you provide at sign-up, portfolio statements
                you upload for analysis, and usage data required to operate the service.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-foreground">How we use data</h2>
              <p>
                Uploaded statements are used to generate portfolio analytics within your
                workspace. We do not sell client portfolio data.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-foreground">Retention</h2>
              <p>
                Data is retained for as long as needed to provide the service and meet legal
                obligations. You may request deletion of your account data by contacting us.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-foreground">Security</h2>
              <p>
                We apply industry-standard safeguards for data in transit and at rest. No
                method of transmission over the internet is completely secure.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-foreground">Contact</h2>
              <p>
                Privacy questions can be submitted through the demo request form on this site.
              </p>
            </section>
          </div>
        </div>
      </MarketingSection>
    </MarketingLayout>
  )
}
