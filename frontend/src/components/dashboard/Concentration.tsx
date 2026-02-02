import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import type { ConcentrationData } from "@/types/api"

interface ConcentrationProps {
  concentration: ConcentrationData
}

function ConcentrationInner({ concentration }: ConcentrationProps) {
  const con = concentration
  return (
    <div className="mb-8 sm:mb-12">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">
        Portfolio Concentration
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        <Card className="border-slate-100">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-4 right-4">
              <SectionInfoTooltip
                title="Your Funds"
                content={
                  <>
                    Number of distinct schemes (funds) in your portfolio. Status is
                    &quot;healthy&quot; when count is in the recommended range (7–10).
                    Top funds are sorted by market value; allocation % = fund value ÷
                    total portfolio value × 100.
                  </>
                }
              />
            </div>
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-bold text-lg text-slate-800">Your Funds:</h3>
              <Badge
                variant={
                  con.fund_status.toLowerCase().includes("healthy")
                    ? "secondary"
                    : "destructive"
                }
                className="text-[10px] uppercase"
              >
                {con.fund_status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6 sm:mb-8">
              <div className="p-4 sm:p-6 bg-red-50/50 rounded-2xl border border-red-50">
                <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">
                  Current funds
                </p>
                <h4 className="text-2xl sm:text-3xl font-bold text-red-600">
                  {con.fund_count}
                </h4>
              </div>
              <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">
                  Recommended funds
                </p>
                <h4 className="text-2xl sm:text-3xl font-bold text-slate-800">7-10</h4>
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-[10px] uppercase rounded-l-xl">
                    Top Funds
                  </TableHead>
                  <TableHead className="text-right text-[10px] uppercase">
                    Value (Lakhs)
                  </TableHead>
                  <TableHead className="text-right text-[10px] uppercase rounded-r-xl">
                    Allocation %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(con.top_funds ?? []).map((f, i) => (
                  <TableRow key={i} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-700">
                      {f.name}
                    </TableCell>
                    <TableCell className="text-right text-slate-600 font-bold">
                      {(f.value / 100_000).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {f.allocation_pct}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardContent className="p-4 sm:p-6 lg:p-8 relative">
            <div className="absolute top-4 right-4">
              <SectionInfoTooltip
                title="Your AMCs"
                content={
                  <>
                    Number of Asset Management Companies (AMCs) you invest with.
                    Status is &quot;healthy&quot; when count is in the recommended range (5–7).
                    Top AMCs show total value and allocation % per AMC.
                  </>
                }
              />
            </div>
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-bold text-lg text-slate-800">Your AMCs:</h3>
              <Badge
                variant={
                  con.amc_status.toLowerCase().includes("healthy")
                    ? "secondary"
                    : "destructive"
                }
                className="text-[10px] uppercase"
              >
                {con.amc_status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6 sm:mb-8">
              <div className="p-4 sm:p-6 bg-red-50/50 rounded-2xl border border-red-50">
                <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">
                  Current AMCs
                </p>
                <h4 className="text-2xl sm:text-3xl font-bold text-red-600">
                  {con.amc_count}
                </h4>
              </div>
              <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">
                  Recommended AMCs
                </p>
                <h4 className="text-2xl sm:text-3xl font-bold text-slate-800">5-7</h4>
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-[10px] uppercase rounded-l-xl">
                    Top AMCs
                  </TableHead>
                  <TableHead className="text-right text-[10px] uppercase">
                    Value (Lakhs)
                  </TableHead>
                  <TableHead className="text-right text-[10px] uppercase rounded-r-xl">
                    Allocation %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(con.top_amcs ?? []).map((a, i) => (
                  <TableRow key={i} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-700">
                      {a.name}
                    </TableCell>
                    <TableCell className="text-right text-slate-600 font-bold">
                      {(a.value / 100_000).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {a.allocation_pct}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const Concentration = memo(ConcentrationInner)
