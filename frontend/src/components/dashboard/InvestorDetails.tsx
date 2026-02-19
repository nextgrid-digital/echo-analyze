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
    <WideCard>
      <div className="space-y-6">
        {/* Name - Most prominent header */}
        {investorInfo.name && (
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
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
                <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
