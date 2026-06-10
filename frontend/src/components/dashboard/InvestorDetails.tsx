import { memo } from "react"
import { User, CreditCard, Mail, Phone } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatPercent } from "@/lib/format"
import type { InvestorInfo } from "@/types/api"

interface InvestorDetailsProps {
  investorInfo: InvestorInfo
  statementDate?: string | null
  portfolioValue?: number
  portfolioReturn?: number
}

function formatLakhsCompact(value: number) {
  if (value >= 100_000) {
    return `Rs ${(value / 100_000).toFixed(2)} Lakhs`
  }
  return `Rs ${value.toLocaleString("en-IN")}`
}

export const InvestorDetails = memo(function InvestorDetails({
  investorInfo,
  statementDate,
  portfolioValue,
  portfolioReturn,
}: InvestorDetailsProps) {
  const hasData =
    investorInfo.name ||
    investorInfo.pan ||
    investorInfo.email ||
    investorInfo.phone

  if (!hasData) {
    return null
  }

  const contactFields = [
    investorInfo.pan && {
      key: "pan",
      icon: CreditCard,
      label: "PAN",
      value: investorInfo.pan,
      valueClass: "font-mono text-sm font-semibold text-background",
    },
    investorInfo.email && {
      key: "email",
      icon: Mail,
      label: "Email",
      value: investorInfo.email,
      valueClass: "break-all text-sm font-medium text-background/90",
    },
    investorInfo.phone && {
      key: "phone",
      icon: Phone,
      label: "Phone",
      value: investorInfo.phone,
      valueClass: "text-sm font-medium text-background/90",
    },
  ].filter(Boolean) as Array<{
    key: string
    icon: typeof CreditCard
    label: string
    value: string
    valueClass: string
  }>

  const contactGridClass =
    contactFields.length >= 3
      ? "sm:grid-cols-3"
      : contactFields.length === 2
        ? "sm:grid-cols-2"
        : "grid-cols-1"

  const isPositiveReturn = (portfolioReturn ?? 0) >= 0

  return (
    <Card className="dashboard-hero relative gap-0 overflow-hidden border-foreground/20 bg-foreground py-0 text-background">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />

      <CardContent className="relative px-5 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground">
                ECHO Report
              </span>
              {statementDate && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-background/50">
                  {statementDate}
                </span>
              )}
            </div>

            {investorInfo.name && (
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-background/10 text-primary ring-1 ring-background/20">
                  <User className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-background/50">
                    Portfolio holder
                  </p>
                  <h1 className="truncate text-2xl font-bold tracking-tight text-background sm:text-3xl lg:text-4xl">
                    {investorInfo.name}
                  </h1>
                </div>
              </div>
            )}
          </div>

          {(portfolioValue !== undefined || portfolioReturn !== undefined) && (
            <div className="flex flex-wrap items-stretch gap-3 lg:justify-end">
              {portfolioValue !== undefined && portfolioValue > 0 && (
                <div className="min-w-[140px] rounded-xl border border-background/15 bg-background/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-background/50">
                    Portfolio value
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-background sm:text-2xl">
                    {formatLakhsCompact(portfolioValue)}
                  </p>
                </div>
              )}
              {portfolioReturn !== undefined && portfolioReturn !== 0 && (
                <div className="min-w-[120px] rounded-xl border border-background/15 bg-background/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-background/50">
                    Return
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-mono text-xl font-bold sm:text-2xl",
                      isPositiveReturn ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {isPositiveReturn ? "+" : ""}
                    {formatPercent(portfolioReturn)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {contactFields.length > 0 && (
          <div
            className={cn(
              "grid grid-cols-1 gap-3 border-t border-background/15 pt-5",
              contactGridClass
            )}
          >
            {contactFields.map((field) => {
              const Icon = field.icon
              return (
                <div
                  key={field.key}
                  className="rounded-lg border border-background/15 bg-background/5 px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-background/50">
                      {field.label}
                    </p>
                  </div>
                  <p className={cn("mt-1.5 pl-5", field.valueClass)}>{field.value}</p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
