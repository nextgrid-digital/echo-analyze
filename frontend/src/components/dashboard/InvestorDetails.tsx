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
    <WideCard accent="cyan" className="overflow-hidden p-0">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:px-6">
        {investorInfo.name && (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
                Investor
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {investorInfo.name}
              </h2>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
        {investorInfo.pan && (
          <div className="flex flex-col gap-2 bg-white px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0 text-slate-500" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                PAN
              </p>
            </div>
            <p className="pl-6 font-mono text-sm font-semibold text-slate-900">
              {investorInfo.pan}
            </p>
          </div>
        )}

        {investorInfo.email && (
          <div className="flex flex-col gap-2 bg-white px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-slate-500" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Email
              </p>
            </div>
            <p className="break-all pl-6 text-sm font-medium text-slate-900">
              {investorInfo.email}
            </p>
          </div>
        )}

        {investorInfo.phone && (
          <div className="flex flex-col gap-2 bg-white px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-slate-500" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Phone
              </p>
            </div>
            <p className="pl-6 text-sm font-medium text-slate-900">
              {investorInfo.phone}
            </p>
          </div>
        )}
      </div>
    </WideCard>
  )
})
