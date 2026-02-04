import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import type { OverlapData } from "@/types/api"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface FundOverlapProps {
  overlap: OverlapData
}

function overlapColor(pct: number): string {
  if (pct >= 75) return "bg-destructive/90 text-white"
  if (pct >= 50) return "bg-destructive/60 text-white"
  if (pct >= 25) return "bg-primary/60 text-primary-foreground"
  if (pct > 0) return "bg-primary/40 text-primary-foreground"
  return "bg-muted text-muted-foreground"
}

/** Abbreviate fund name for axis: first word or first 12 chars */
function abbreviate(name: string, maxLen = 14): string {
  const s = name.trim()
  const first = s.split(/\s+/)[0] ?? s
  if (first.length <= maxLen) return first
  return first.slice(0, maxLen - 1) + "…"
}

export const FundOverlap = memo(function FundOverlap({ overlap }: FundOverlapProps) {
  const { fund_codes, fund_names, matrix } = overlap
  const n = fund_codes.length
  if (n < 2) return null

  return (
    <div className="mb-8 sm:mb-12">
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Fund Overlap
        </h2>
        <SectionInfoTooltip
          title="Fund Overlap"
          content={
            <>
              Overlap is how much of two funds&apos; portfolios is in the same
              stocks. It is the sum of the minimum weight of each common holding
              (0–100%). High overlap means less diversification between those
              funds.
            </>
          }
        />
      </div>
      <Card className="border-border overflow-hidden">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <div className="inline-block min-w-full">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-bold text-muted-foreground sticky left-0 bg-background z-10 border-b border-r border-border min-w-[120px] sm:min-w-[140px]">
                      Fund
                    </th>
                    {fund_names.map((name, j) => (
                      <th
                        key={fund_codes[j]}
                        className="p-1 sm:p-2 text-center font-bold text-muted-foreground border-b border-border whitespace-nowrap max-w-[80px] sm:max-w-[100px]"
                        title={name}
                      >
                        {abbreviate(name)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, i) => (
                    <tr key={fund_codes[i]}>
                      <td
                        className="sticky left-0 bg-muted/95 border-r border-b border-border p-1 sm:p-2 font-medium text-foreground whitespace-nowrap max-w-[120px] sm:max-w-[140px] truncate"
                        title={fund_names[i]}
                      >
                        {abbreviate(fund_names[i])}
                      </td>
                      {row.map((val, j) => {
                        const isDiagonal = i === j
                        const display = isDiagonal ? "–" : `${val}%`
                        const cellClass = isDiagonal
                          ? "bg-muted text-muted-foreground font-medium"
                          : overlapColor(val)
                        return (
                          <td
                            key={j}
                            className={`p-1 sm:p-2 text-center border-b border-border align-middle min-w-[44px] sm:min-w-[52px] font-mono ${cellClass}`}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-block w-full cursor-default rounded">
                                  {display}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[280px] bg-popover text-popover-foreground border border-border">
                                <p className="font-semibold">
                                  {fund_names[i]} vs {fund_names[j]}
                                </p>
                                <p className="text-muted-foreground">
                                  {isDiagonal
                                    ? "Same fund"
                                    : `Overlap: ${val}%`}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
