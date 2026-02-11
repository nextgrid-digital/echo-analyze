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
  // 100% is self-overlap, grey it out
  if (pct >= 99.9) return "bg-muted text-muted-foreground font-medium"

  // High overlap (> 50%) -> Red (Bad diversification)
  if (pct >= 70) return "bg-red-600 text-white font-bold"
  if (pct >= 60) return "bg-red-500 text-white font-bold"
  if (pct >= 50) return "bg-red-400 text-white"

  // Medium overlap (30-50%) -> Yellow/Orange
  if (pct >= 40) return "bg-orange-400 text-black font-semibold"
  if (pct >= 30) return "bg-yellow-400 text-black font-semibold"

  // Low overlap (< 30%) -> Green (Good diversification)
  if (pct >= 20) return "bg-green-400 text-black"
  if (pct >= 10) return "bg-green-500 text-white"
  return "bg-green-600 text-white"
}

/** Abbreviate fund name for axis: remove clutter and keep key parts */
function abbreviate(name: string, maxLen = 16): string {
  // 1. Remove common noise
  let s = name
    .replace(/\s*-\s*Direct.*$/gi, "") // Remove Direct Plan/Growth suffix
    .replace(/\s*-\s*Regular.*$/gi, "")
    .replace(/Direct Plan|Growth|Regular Plan/gi, "")
    .replace(/Mutual Fund/gi, "")
    .replace(/Fund/gi, "") // "Fund" is redundant in most contexts here
    .replace(/\s+/g, " ")
    .trim()

  if (s.length <= maxLen) return s

  // 2. If still long, try to keep first word + something else
  const words = s.split(" ")
  if (words.length >= 2) {
    // If it's something like "Axis Bluechip", that's 13 chars - perfect.
    const duo = `${words[0]} ${words[1]}`
    if (duo.length <= maxLen) return duo
  }

  // 3. Last resort: truncate
  return s.slice(0, maxLen - 1) + "…"
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
                        // Diagonal is always 100, so we can use that for color lookup or just hardcode
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
                                <span className="inline-block w-full h-full cursor-default rounded flex items-center justify-center">
                                  {isDiagonal ? "–" : `${val}%`}
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
