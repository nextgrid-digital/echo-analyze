import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import type { PerformanceSummary as PerfSummary } from "@/types/api"

interface PerformanceProps {
  performance: PerfSummary
}

export const Performance = memo(function Performance({ performance }: PerformanceProps) {
  const p = performance
  return (
    <div className="mb-12">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
        Performance Summary
      </h2>
      <p className="text-slate-400 text-sm font-medium mb-6 sm:mb-8">
        Active portfolio performance against respective benchmark indexes
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        <Card className="border-slate-100">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-4 right-4">
              <SectionInfoTooltip
                title="1 Year Performance"
                content={
                  <>
                    % of portfolio (by value) where the scheme underperformed its
                    benchmark over 1 year. &quot;Upto 3%&quot; = underperformance ≤3%;
                    &quot;More than 3%&quot; = underperformance &gt;3%. Compared to
                    scheme-level benchmarks (e.g. Nifty 50, CRISIL indices).
                  </>
                }
              />
            </div>
            <h3 className="font-bold text-lg text-slate-800 border-b border-slate-100 pb-4 mb-4">
              1 YEAR PERIOD
            </h3>
            <div className="mb-8">
              <Badge variant="destructive" className="mb-3 text-[10px] uppercase">
                Critical underperformance
              </Badge>
              <h4 className="text-3xl font-bold text-slate-900 leading-tight">
                {p.one_year.underperforming_pct}% of active portfolio
                under-performed the respective benchmarks
              </h4>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                Under Performance
              </h5>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-500">
                      Upto 3% <br />
                      <span className="font-normal text-[10px]">
                        Underperformance
                      </span>
                    </span>
                    <span className="text-slate-900 text-base">
                      {p.one_year.upto_3_pct}%
                    </span>
                  </div>
                  <div className="w-full h-8 bg-white rounded-lg overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-red-100"
                      style={{ width: `${p.one_year.upto_3_pct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-500">
                      More than 3% <br />
                      <span className="font-normal text-[10px]">
                        Underperformance
                      </span>
                    </span>
                    <span className="text-slate-900 text-base">
                      {p.one_year.more_than_3_pct}%
                    </span>
                  </div>
                  <div className="w-full h-8 bg-white rounded-lg overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-red-400"
                      style={{ width: `${p.one_year.more_than_3_pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-4 right-4">
              <SectionInfoTooltip
                title="3 Year Performance"
                content={
                  <>
                    % of portfolio (by value) where the scheme underperformed its
                    benchmark over 3 years. Same breakdown as 1Y: upto 3% vs more
                    than 3% underperformance vs scheme benchmarks.
                  </>
                }
              />
            </div>
            <h3 className="font-bold text-lg text-slate-800 border-b border-slate-100 pb-4 mb-4">
              3 YEAR PERIOD
            </h3>
            <div className="mb-8">
              <Badge variant="destructive" className="mb-3 text-[10px] uppercase">
                Critical underperformance
              </Badge>
              <h4 className="text-3xl font-bold text-slate-900 leading-tight">
                {p.three_year.underperforming_pct}% of active portfolio
                under-performed the respective benchmarks
              </h4>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                Under Performance
              </h5>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-500">
                      Upto 3% <br />
                      <span className="font-normal text-[10px]">
                        Underperformance
                      </span>
                    </span>
                    <span className="text-slate-900 text-base">
                      {p.three_year.upto_3_pct}%
                    </span>
                  </div>
                  <div className="w-full h-8 bg-white rounded-lg overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-red-100"
                      style={{ width: `${p.three_year.upto_3_pct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-500">
                      More than 3% <br />
                      <span className="font-normal text-[10px]">
                        Underperformance
                      </span>
                    </span>
                    <span className="text-slate-900 text-base">
                      {p.three_year.more_than_3_pct}%
                    </span>
                  </div>
                  <div className="w-full h-8 bg-white rounded-lg overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-red-400"
                      style={{ width: `${p.three_year.more_than_3_pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})
