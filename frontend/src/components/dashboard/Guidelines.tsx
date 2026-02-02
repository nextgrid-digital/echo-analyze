import { memo, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import type { GuidelinesData } from "@/types/api"

interface GuidelinesProps {
  guidelines: GuidelinesData
}

const MC_COLORS = ["#43766C", "#7091F5", "#97Feed"]

export const Guidelines = memo(function Guidelines({ guidelines }: GuidelinesProps) {
  const g = guidelines
  const rec = g.investment_guidelines
  const mcCurrent = useMemo(
    () => rec.equity_mc.map((i) => i.current),
    [rec.equity_mc]
  )
  const mcRec = useMemo(
    () => rec.equity_mc.map((i) => i.recommended),
    [rec.equity_mc]
  )
  const ytmCur = rec.fi_metrics?.find((i) => i.label.includes("YTM"))?.current ?? 0
  const maturityCur =
    rec.fi_metrics?.find((i) => i.label.includes("Maturity"))?.current ?? 0
  const ytmRec = rec.fi_metrics?.find((i) => i.label.includes("YTM"))?.recommended ?? 0
  const maturityRec =
    rec.fi_metrics?.find((i) => i.label.includes("Maturity"))?.recommended ?? 0

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          Investment Guidelines
        </h2>
        <div className="flex items-center gap-2">
          <SectionInfoTooltip
            title="Investment Guidelines"
            content={
              <>
                Current vs recommended portfolio: asset allocation, equity market-cap
                mix (large/mid/small), and fixed income metrics (YTM, maturity).
                Indicative tables show suggested equity/FI allocation by category.
              </>
            }
          />
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
            Portfolio as on --
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        <Card className="border-slate-100">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-4 right-4">
              <SectionInfoTooltip
                title="Current Portfolio"
                content={
                  <>
                    Your current asset allocation and equity market-cap mix; fixed
                    income Net YTM and average maturity. Values from your statement.
                  </>
                }
              />
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-6">
              Current Portfolio
            </h3>
            <div className="bg-slate-50/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                Asset Allocation
              </h4>
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <Table>
                  <TableBody>
                    {(rec.asset_allocation ?? []).map((i, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="py-2 text-slate-500 font-medium">
                          {i.label}
                        </TableCell>
                        <TableCell className="py-2 text-right font-bold text-slate-900">
                          {i.current}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Equity
                </h4>
                <div className="relative size-[120px] sm:size-[150px] mx-auto">
                  {mcCurrent.some((v) => v > 0) && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={mcCurrent.map((v, i) => ({
                            name: rec.equity_mc[i]?.label ?? "",
                            value: v,
                            color: MC_COLORS[i],
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          dataKey="value"
                        >
                          {mcCurrent.map((_, i) => (
                            <Cell key={i} fill={MC_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number | undefined) => v != null ? `${v}%` : ""} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-emerald-500">
                      {mcCurrent[0] ?? 0}%
                    </span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase">
                      Large
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Fixed Income
                </h4>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Net YTM
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                      {ytmCur}%
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Avg Maturity
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                      {maturityCur}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/20">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-4 right-4">
              <SectionInfoTooltip
                title="Recommended Portfolio"
                content={
                  <>
                    Suggested asset allocation and equity market-cap mix; target Net
                    YTM and maturity for fixed income. Based on policy or guideline
                    inputs.
                  </>
                }
              />
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-6">
              Recommended Portfolio
            </h3>
            <div className="bg-white/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                Asset Allocation
              </h4>
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <Table>
                  <TableBody>
                    {(rec.asset_allocation ?? []).map((i, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="py-2 text-slate-500 font-medium">
                          {i.label}
                        </TableCell>
                        <TableCell className="py-2 text-right font-bold text-emerald-600">
                          {i.recommended}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Equity
                </h4>
                <div className="relative size-[120px] sm:size-[150px] mx-auto">
                  {mcRec.some((v) => v > 0) && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={mcRec.map((v, i) => ({
                            name: rec.equity_mc[i]?.label ?? "",
                            value: v,
                            color: MC_COLORS[i],
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          dataKey="value"
                        >
                          {mcRec.map((_, i) => (
                            <Cell key={i} fill={MC_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number | undefined) => v != null ? `${v}%` : ""} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-emerald-600">
                      {mcRec[0] ?? 0}%
                    </span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase">
                      Large
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Fixed Income
                </h4>
                <div className="space-y-4">
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-emerald-50">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase">
                      Net YTM
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                      {ytmRec}%
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-emerald-50">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase">
                      Avg Maturity
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                      {maturityRec}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {g.equity_indicative?.length > 0 && (
        <Card className="mt-6 sm:mt-8 border-slate-100">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-4 right-4">
              <SectionInfoTooltip
                title="Indicative Equity Allocation"
                content={
                  <>
                    Suggested equity allocation by category (e.g. Large Cap, Mid
                    Cap). Allocation % is of total equity.
                  </>
                }
              />
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-6">
              Indicative Allocation:{" "}
              <span className="text-emerald-500">Equity</span>
            </h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-[10px] uppercase">Category</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">
                      Allocation %
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.equity_indicative.map((i, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="py-2 text-slate-500 font-medium">
                        {i.category}
                      </TableCell>
                      <TableCell className="py-2 text-right font-bold text-slate-900">
                        {i.allocation}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {g.fi_indicative?.length > 0 && (
        <Card className="mt-6 sm:mt-8 border-slate-100">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-4 right-4">
              <SectionInfoTooltip
                title="Indicative Fixed Income Allocation"
                content={
                  <>
                    Suggested FI allocation by issuer; PQRS (rating), YTM, tenure,
                    and allocation %. Based on guideline inputs.
                  </>
                }
              />
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-6">
              Indicative Allocation:{" "}
              <span className="text-indigo-500">Fixed Income</span>
            </h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-[9px] uppercase">Issuer</TableHead>
                    <TableHead className="text-right text-[9px] uppercase">
                      PQRS
                    </TableHead>
                    <TableHead className="text-right text-[9px] uppercase">
                      YTM
                    </TableHead>
                    <TableHead className="text-right text-[9px] uppercase">
                      Tenure
                    </TableHead>
                    <TableHead className="text-right text-[9px] uppercase">
                      Alloc
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.fi_indicative.map((i, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="py-3 font-medium text-slate-700">
                        {i.issuer}
                      </TableCell>
                      <TableCell className="py-3 text-right font-bold text-slate-400">
                        {i.pqrs ?? "-"}
                      </TableCell>
                      <TableCell className="py-3 text-right font-bold text-slate-900">
                        {i.ytm}%
                      </TableCell>
                      <TableCell className="py-3 text-right font-bold text-slate-600">
                        {i.tenure}
                      </TableCell>
                      <TableCell className="py-3 text-right font-bold text-slate-900">
                        {i.allocation}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
})
