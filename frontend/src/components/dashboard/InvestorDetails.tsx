import { memo } from "react"
import { WideCard } from "./cards/WideCard"
import { CalendarDays, TrendingUp, User, CreditCard, Mail, Phone } from "lucide-react"
import { formatPercent, toLakhs } from "@/lib/format"
import type { InvestorInfo } from "@/types/api"

interface InvestorDetailsProps {
  investorInfo: InvestorInfo
  statementDate?: string | null
  portfolioValue?: number
  portfolioReturn?: number
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
      iconClass: "text-teal-600",
      label: "PAN",
      value: investorInfo.pan,
      valueClass: "font-mono text-sm font-bold text-slate-900 dark:text-slate-100",
    },
    investorInfo.email && {
      key: "email",
      icon: Mail,
      iconClass: "text-blue-600",
      label: "Email",
      value: investorInfo.email,
      valueClass: "break-all text-sm font-semibold text-slate-800 dark:text-slate-200",
    },
    investorInfo.phone && {
      key: "phone",
      icon: Phone,
      iconClass: "text-cyan-600",
      label: "Phone",
      value: investorInfo.phone,
      valueClass: "text-sm font-semibold text-slate-800 dark:text-slate-200",
    },
  ].filter(Boolean) as Array<{
    key: string
    icon: typeof CreditCard
    iconClass: string
    label: string
    value: string
    valueClass: string
  }>

  const contactGridClass =
    contactFields.length >= 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : contactFields.length === 2
        ? "sm:grid-cols-2"
        : "grid-cols-1"

  return (
    <WideCard accent="cyan" className="overflow-hidden border-0 p-0 shadow-2xl shadow-cyan-500/15">
      <div className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 px-5 py-5 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-32 w-32 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.12),transparent_55%)]" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {investorInfo.name && (
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-xl ring-1 ring-white/30 backdrop-blur-md">
                <User className="h-7 w-7" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-100/90">
                  Portfolio holder
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  {investorInfo.name}
                </h2>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {statementDate && (
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/25 backdrop-blur-sm">
                <CalendarDays className="h-3.5 w-3.5" />
                {statementDate}
              </div>
            )}
            {portfolioValue !== undefined && portfolioValue > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/25 backdrop-blur-sm">
                <TrendingUp className="h-3.5 w-3.5" />
                {toLakhs(portfolioValue)}
              </div>
            )}
            {portfolioReturn !== undefined && portfolioReturn !== 0 && (
              <div className="rounded-full bg-emerald-400/25 px-3 py-1.5 text-xs font-semibold text-emerald-50 ring-1 ring-emerald-200/30 backdrop-blur-sm">
                {portfolioReturn >= 0 ? "+" : ""}
                {formatPercent(portfolioReturn)} return
              </div>
            )}
          </div>
        </div>
      </div>

      {contactFields.length > 0 && (
        <div
          className={`grid grid-cols-1 gap-px bg-gradient-to-r from-cyan-100 via-teal-100 to-blue-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 ${contactGridClass}`}
        >
          {contactFields.map((field) => {
            const Icon = field.icon
            return (
              <div
                key={field.key}
                className="flex flex-col gap-2 bg-white/95 px-5 py-4 backdrop-blur-sm dark:bg-slate-900/95 sm:px-6"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 shrink-0 ${field.iconClass}`} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {field.label}
                  </p>
                </div>
                <p className={`pl-6 ${field.valueClass}`}>{field.value}</p>
              </div>
            )
          })}
        </div>
      )}
    </WideCard>
  )
})
