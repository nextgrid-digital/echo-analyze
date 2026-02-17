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
import { CHART_COLORS_3 } from "@/lib/chartColors"
import type { GuidelinesData } from "@/types/api"

interface GuidelinesProps {
  guidelines: GuidelinesData
}

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
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
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
          <span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full uppercase tracking-widest">
            Portfolio as on --
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        <Card className="border-border">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-2 right-3">
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
            <h3 className="font-bold text-xl text-foreground mb-6">
              Current Portfolio
            </h3>
            <div className="bg-muted/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                Asset Allocation
              </h4>
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <Table>
                  <TableBody>
                    {(rec.asset_allocation ?? []).map((i, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="py-2 text-muted-foreground font-medium">
                          {i.label}
                        </TableCell>
                        <TableCell className="py-2 text-right font-bold text-foreground font-mono">
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
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
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
                            color: CHART_COLORS_3[i],
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          dataKey="value"
                        >
                          {mcCurrent.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS_3[i]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number | undefined) => v != null ? `${v}%` : ""} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-primary font-mono">
                      {mcCurrent[0] ?? 0}%
                    </span>
                    <span className="text-[8px] text-muted-foreground font-bold uppercase">
                      Large
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Fixed Income
                </h4>
                <div className="space-y-4">
                  <div className="bg-muted p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">
                      Net YTM
                    </div>
                    <div className="text-lg font-bold text-foreground font-mono">
                      {ytmCur}%
                    </div>
                  </div>
                  <div className="bg-muted p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">
                      Avg Maturity
                    </div>
                    <div className="text-lg font-bold text-foreground font-mono">
                      {maturityCur}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/10">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-2 right-3">
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
            <h3 className="font-bold text-xl text-foreground mb-6">
              Recommended Portfolio
            </h3>
            <div className="bg-muted/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                Asset Allocation
              </h4>
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <Table>
                  <TableBody>
                    {(rec.asset_allocation ?? []).map((i, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="py-2 text-muted-foreground font-medium">
                          {i.label}
                        </TableCell>
                        <TableCell className="py-2 text-right font-bold text-primary font-mono">
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
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
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
                            color: CHART_COLORS_3[i],
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          dataKey="value"
                        >
                          {mcRec.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS_3[i]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number | undefined) => v != null ? `${v}%` : ""} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-primary font-mono">
                      {mcRec[0] ?? 0}%
                    </span>
                    <span className="text-[8px] text-muted-foreground font-bold uppercase">
                      Large
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Fixed Income
                </h4>
                <div className="space-y-4">
                  <div className="bg-card p-3 rounded-none border border-border">
                    <div className="text-[10px] font-bold text-primary uppercase">
                      Net YTM
                    </div>
                    <div className="text-lg font-bold text-foreground font-mono">
                      {ytmRec}%
                    </div>
                  </div>
                  <div className="bg-card p-3 rounded-none border border-border">
                    <div className="text-[10px] font-bold text-primary uppercase">
                      Avg Maturity
                    </div>
                    <div className="text-lg font-bold text-foreground font-mono">
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
        <Card className="mt-6 sm:mt-8 border-border">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-2 right-3">
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
            <h3 className="font-bold text-xl text-foreground mb-6">
              Indicative Allocation:{" "}
              <span className="text-primary">Equity</span>
            </h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="text-[10px] uppercase">Category</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">
                      Allocation %
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.equity_indicative.map((i, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="py-2 text-muted-foreground font-medium">
                        {i.category}
                      </TableCell>
                      <TableCell className="py-2 text-right font-bold text-foreground font-mono">
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
        <Card className="mt-6 sm:mt-8 border-border">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-2 right-3">
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
            <h3 className="font-bold text-xl text-foreground mb-6">
              Indicative Allocation:{" "}
              <span className="text-primary">Fixed Income</span>
            </h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
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
                      <TableCell className="py-3 font-medium text-foreground">
                        {i.issuer}
                      </TableCell>
                      <TableCell className="py-3 text-right font-bold text-muted-foreground">
                        {i.pqrs ?? "-"}
                      </TableCell>
                      <TableCell className="py-3 text-right font-bold text-foreground font-mono">
                        {i.ytm}%
                      </TableCell>
                      <TableCell className="py-3 text-right font-bold text-muted-foreground font-mono">
                        {i.tenure}
                      </TableCell>
                      <TableCell className="py-3 text-right font-bold text-foreground font-mono">
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
