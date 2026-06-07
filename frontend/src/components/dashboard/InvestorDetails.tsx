import { memo } from "react"
import { WideCard } from "./cards/WideCard"
import { User, CreditCard, Mail, Phone } from "lucide-react"
import type { InvestorInfo } from "@/types/api"

interface InvestorDetailsProps {
  investorInfo: InvestorInfo
}

export const InvestorDetails = memo(function InvestorDetails({
  investorInfo,
}: InvestorDetailsProps) {
  const hasData =
    investorInfo.name ||
    investorInfo.pan ||
    investorInfo.email ||
    investorInfo.phone

  if (!hasData) {
    return null
  }

  return (
    <WideCard accent="cyan" className="overflow-hidden border-0 p-0 shadow-xl shadow-cyan-500/10">
      <div className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 px-5 py-5 sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-24 w-24 rounded-full bg-emerald-300/20 blur-2xl" />
        {investorInfo.name && (
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100/90">
                Portfolio holder
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {investorInfo.name}
              </h2>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-px bg-gradient-to-r from-cyan-100 via-teal-100 to-blue-100 sm:grid-cols-2 lg:grid-cols-4">
        {investorInfo.pan && (
          <div className="flex flex-col gap-2 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0 text-teal-600" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                PAN
              </p>
            </div>
            <p className="pl-6 font-mono text-sm font-bold text-slate-900">
              {investorInfo.pan}
            </p>
          </div>
        )}

        {investorInfo.email && (
          <div className="flex flex-col gap-2 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-blue-600" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Email
              </p>
            </div>
            <p className="break-all pl-6 text-sm font-semibold text-slate-800">
              {investorInfo.email}
            </p>
          </div>
        )}

        {investorInfo.phone && (
          <div className="flex flex-col gap-2 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-cyan-600" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Phone
              </p>
            </div>
            <p className="pl-6 text-sm font-semibold text-slate-800">
              {investorInfo.phone}
            </p>
          </div>
        )}
      </div>
    </WideCard>
  )
})
