import { memo } from "react"
import { CompactCard } from "./cards/CompactCard"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { TrendingUp } from "lucide-react"
import { toLakhs } from "@/lib/format"
import type { AnalysisSummary } from "@/types/api"

interface TaxAnalysisProps {
  summary: AnalysisSummary
}

function TaxAnalysisInner({ summary }: TaxAnalysisProps) {
  const taxData = summary.tax ?? {
    short_term_gains: 0,
    long_term_gains: 0,
    tax_free_gains: 0,
    taxable_gains: 0,
    estimated_tax_liability: 0,
    equity_stcg_rate_pct: 20,
    equity_ltcg_rate_pct: 12,
    equity_ltcg_exemption: 125000,
  }

  return (
    <div className="mb-6 sm:mb-8">
      <div className="mb-3 border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-900">
        Estimated metrics: tax buckets are indicative and should not be used for tax filing decisions.
      </div>
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
                  Equity gains from holdings held for less than 1 year.
                </>
              }
            />
          </div>
          <p className="text-xl font-bold text-foreground font-mono">
            {toLakhs(taxData.short_term_gains)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Taxed at {taxData.equity_stcg_rate_pct}% (equity)
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
                  Long-Term Gains = Gains from holdings &gt;= 1 year old
                </>
              }
              content={
                <>
                  Equity gains from holdings held for 1 year or more.
                </>
              }
            />
          </div>
          <p className="text-xl font-bold text-foreground font-mono">
            {toLakhs(taxData.long_term_gains)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Taxed at {taxData.equity_ltcg_rate_pct}% after {toLakhs(taxData.equity_ltcg_exemption)} exemption
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
                  Gains from tax-exempt instruments that are not subject to capital gains tax.
                </>
              }
            />
          </div>
          <p className="text-xl font-bold text-green-600 font-mono">
            {toLakhs(taxData.tax_free_gains)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Exempt gains
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
                  Taxable Gains = Short-Term + Long-Term - Tax-Free
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
            {toLakhs(taxData.taxable_gains)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Est. tax: {toLakhs(taxData.estimated_tax_liability)}
          </p>
        </CompactCard>
      </div>
    </div>
  )
}

export const TaxAnalysis = memo(TaxAnalysisInner)
