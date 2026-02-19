import { memo, useMemo } from "react"
import { CompactCard } from "./cards/CompactCard"
import { WideCard } from "./cards/WideCard"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { TrendingUp } from "lucide-react"
import { toLakhs } from "@/lib/format"
import type { AnalysisSummary, Holding } from "@/types/api"

interface TaxAnalysisProps {
  summary: AnalysisSummary
  holdings: Holding[]
}

function TaxAnalysisInner({ summary, holdings }: TaxAnalysisProps) {
  const taxData = useMemo(() => {
    const now = new Date()
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

    let shortTermGains = 0
    let longTermGains = 0
    let taxFreeGains = 0
    let totalGains = summary.total_gain_loss ?? 0

    // Calculate STCG/LTCG based on date_of_entry
    holdings.forEach((holding) => {
      if (!holding.date_of_entry || !holding.gain_loss) return

      const entryDate = new Date(holding.date_of_entry)
      const isLongTerm = entryDate < oneYearAgo
      const gain = holding.gain_loss

      if (gain > 0) {
        if (isLongTerm) {
          longTermGains += gain
        } else {
          shortTermGains += gain
        }
      }
    })

    // Estimate tax-free gains (ELSS, PPF, etc.)
    // This is simplified - would need actual tax status from fund data
    const elssHoldings = holdings.filter(
      (h) => h.category?.toLowerCase().includes("elss") || h.sub_category?.toLowerCase().includes("elss")
    )
    const elssGains = elssHoldings.reduce((sum, h) => sum + (h.gain_loss ?? 0), 0)
    taxFreeGains = Math.max(0, elssGains)

    const taxableGains = shortTermGains + longTermGains - taxFreeGains
    const taxEfficiencyScore =
      totalGains > 0 ? ((taxFreeGains / totalGains) * 100) : 0

    return {
      shortTermGains,
      longTermGains,
      taxFreeGains,
      taxableGains,
      taxEfficiencyScore,
      totalGains,
    }
  }, [summary, holdings])

  return (
    <div className="mb-6 sm:mb-8">
      {/* Tax Metrics - Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Short-Term Gains
            </p>
            <SectionInfoTooltip
              title="Short-Term Gains"
              formula={
                <>
                  Short-Term Gains = Gains from holdings &lt; 1 year old
                </>
              }
              content={
                <>
                  Capital gains from holdings held for less than 1 year. Taxed at your income tax slab rate.
                </>
              }
            />
          </div>
          <p className="text-xl font-bold text-foreground font-mono">
            {toLakhs(taxData.shortTermGains)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Taxed at slab rate
          </p>
        </CompactCard>

        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Long-Term Gains
            </p>
            <SectionInfoTooltip
              title="Long-Term Gains"
              formula={
                <>
                  Long-Term Gains = Gains from holdings ≥ 1 year old
                </>
              }
              content={
                <>
                  Capital gains from holdings held for 1 year or more. Taxed at 10% (equity) or 20% with indexation (debt).
                </>
              }
            />
          </div>
          <p className="text-xl font-bold text-foreground font-mono">
            {toLakhs(taxData.longTermGains)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Taxed at 10% (equity) or 20% (debt)
          </p>
        </CompactCard>

        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tax-Free Gains
              </p>
            </div>
            <SectionInfoTooltip
              title="Tax-Free Gains"
              formula={
                <>
                  Tax-Free Gains = Gains from ELSS/tax-free instruments
                </>
              }
              content={
                <>
                  Gains from ELSS and other tax-exempt instruments that are not subject to capital gains tax.
                </>
              }
            />
          </div>
          <p className="text-xl font-bold text-green-600 font-mono">
            {toLakhs(taxData.taxFreeGains)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ELSS and tax-exempt
          </p>
        </CompactCard>

        <CompactCard>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Taxable Gains
            </p>
            <SectionInfoTooltip
              title="Taxable Gains"
              formula={
                <>
                  Taxable Gains = Short-Term + Long-Term − Tax-Free
                </>
              }
              content={
                <>
                  Total gains subject to capital gains tax after excluding tax-free gains.
                </>
              }
            />
          </div>
          <p className="text-xl font-bold text-foreground font-mono">
            {toLakhs(taxData.taxableGains)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Subject to tax
          </p>
        </CompactCard>

      </div>
    </div>
  )
}

export const TaxAnalysis = memo(TaxAnalysisInner)
