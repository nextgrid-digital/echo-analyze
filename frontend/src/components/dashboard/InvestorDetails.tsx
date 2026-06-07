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
  // Check if there's any data to display
  const hasData =
    investorInfo.name ||
    investorInfo.pan ||
    investorInfo.email ||
    investorInfo.phone

  if (!hasData) {
    return null
  }

  return (
    <WideCard accent="cyan">
      <div className="space-y-6">
        {/* Name - Most prominent header */}
        {investorInfo.name && (
          <div className="flex items-center gap-3 border-b border-cyan-200/80 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-gradient-to-br from-cyan-500 to-sky-600 text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {investorInfo.name}
              </h2>
            </div>
          </div>
        )}

        {/* Contact details in a grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {investorInfo.pan && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 shrink-0 text-violet-500" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  PAN
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground font-mono pl-6">
                {investorInfo.pan}
              </p>
            </div>
          )}

          {investorInfo.email && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-sky-500" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Email
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground break-all pl-6">
                {investorInfo.email}
              </p>
            </div>
          )}

          {investorInfo.phone && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Phone
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground pl-6">
                {investorInfo.phone}
              </p>
            </div>
          )}
        </div>
      </div>
    </WideCard>
  )
})