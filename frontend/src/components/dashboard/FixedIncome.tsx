import { memo, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { toLakhs } from "@/lib/format"
import type { FixedIncomeData } from "@/types/api"

interface FixedIncomeProps {
  fixedIncome: FixedIncomeData
}

const CREDIT_COLORS = ["#75b9be", "#b2d393", "#efc88d"]

function FixedIncomeInner({ fixedIncome }: FixedIncomeProps) {
  const fi = fixedIncome
  const creditData = useMemo(
    () => [
      { name: "AAA", value: fi.credit_quality.aaa_pct, color: CREDIT_COLORS[0] },
      { name: "AA", value: fi.credit_quality.aa_pct, color: CREDIT_COLORS[1] },
      {
        name: "Below AA",
        value: fi.credit_quality.below_aa_pct,
        color: CREDIT_COLORS[2],
      },
    ].filter((d) => d.value > 0),
    [fi.credit_quality]
  )

  return (
    <div className="mb-8 sm:mb-12">
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          Fixed Income Portfolio{" "}
          <span className="text-indigo-400 font-medium">Deep Dive</span>
        </h2>
        <SectionInfoTooltip
          title="Fixed Income Deep Dive"
          content={
            <>
              Invested/current value of fixed income holdings; IRR (internal rate of
              return) and Net YTM (yield to maturity). Credit quality and category
              allocation are derived from underlying debt schemes.
            </>
          }
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div className="col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-slate-100">
              <CardContent className="p-4 sm:p-6">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                  Invested Value
                </p>
                <h4 className="text-xl font-bold text-slate-900">
                  {toLakhs(fi.invested_value)}
                </h4>
              </CardContent>
            </Card>
            <Card className="border-slate-100">
              <CardContent className="p-4 sm:p-6">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                  Current Value
                </p>
                <h4 className="text-xl font-bold text-slate-900">
                  {toLakhs(fi.current_value)}
                </h4>
              </CardContent>
            </Card>
            <Card className="border-slate-100">
              <CardContent className="p-4 sm:p-6">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                  FI IRR
                </p>
                <h4 className="text-xl font-bold text-slate-900">{fi.irr}%</h4>
              </CardContent>
            </Card>
            <Card className="border-slate-100">
              <CardContent className="p-4 sm:p-6">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                  Net YTM
                </p>
                <h4 className="text-xl font-bold text-slate-900">{fi.ytm}%</h4>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-100">
            <CardContent className="p-4 sm:p-6 lg:p-8 relative">
              <div className="absolute top-4 right-4">
                <SectionInfoTooltip
                  title="Credit Quality"
                  content={
                    <>
                      Split of fixed income by credit rating (AAA, AA, below AA) from
                      underlying holdings. Percentages are of total fixed income
                      value.
                    </>
                  }
                />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-slate-800 mb-6 sm:mb-8">
                Credit Quality
              </h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-6 w-full sm:w-1/3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: CREDIT_COLORS[0] }}
                      />
                      <span className="text-sm text-slate-500 font-bold uppercase tracking-wider">
                        AAA
                      </span>
                    </div>
                    <span className="text-lg font-bold">
                      {fi.credit_quality.aaa_pct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: CREDIT_COLORS[1] }}
                      />
                      <span className="text-sm text-slate-500 font-bold uppercase tracking-wider">
                        AA
                      </span>
                    </div>
                    <span className="text-lg font-bold">
                      {fi.credit_quality.aa_pct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: CREDIT_COLORS[2] }}
                      />
                      <span className="text-sm text-slate-500 font-bold uppercase tracking-wider">
                        Below AA
                      </span>
                    </div>
                    <span className="text-lg font-bold">
                      {fi.credit_quality.below_aa_pct}%
                    </span>
                  </div>
                </div>
                <div className="size-48 h-24 w-full max-w-full shrink-0">
                  {creditData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={creditData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={0}
                          dataKey="value"
                        >
                          {creditData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number | undefined) => v != null ? `${v}%` : ""} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardContent className="p-4 sm:p-6 lg:p-8 relative">
              <div className="absolute top-4 right-4">
                <SectionInfoTooltip
                  title="Category wise allocation"
                  content={
                    <>
                      Allocation % of fixed income by category (e.g. Gilt, Corporate).
                      Each bar shows that category&apos;s share of total FI value.
                    </>
                  }
                />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-6 sm:mb-8">
                Category wise allocation
              </h3>
              <div className="space-y-6">
                {fi.category_allocation.map((a, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-slate-500 uppercase">
                        {a.category}
                      </span>
                      <span className="text-slate-900">{a.allocation_pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-200"
                        style={{ width: `${a.allocation_pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-slate-100">
            <CardContent className="p-4 sm:p-6 lg:p-8 relative">
              <div className="absolute top-4 right-4">
                <SectionInfoTooltip
                  title="Top holdings"
                  content={
                    <>
                      Top fixed income funds and AMCs by market value. Allocation %
                      = holding value ÷ total fixed income value × 100.
                    </>
                  }
                />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-6">
                Top holdings:
              </h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Funds
                  </h4>
                  <Table>
                    <TableBody>
                      {fi.top_funds.map((f, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-slate-700 py-3">
                            {f.name}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900 py-3">
                            {f.allocation_pct}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                    AMCs
                  </h4>
                  <Table>
                    <TableBody>
                      {fi.top_amcs.map((a, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-slate-700 py-3">
                            {a.name}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900 py-3">
                            {a.allocation_pct}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export const FixedIncome = memo(FixedIncomeInner)
