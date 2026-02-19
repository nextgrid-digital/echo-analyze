import { memo } from "react"
import { WideCard } from "./cards/WideCard"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import type { OverlapData } from "@/types/api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
function abbreviate(name: string, maxLen = 10): string {
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
  const hasData = n >= 2 && matrix.length >= 2

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Fund Overlap
        </h2>
        <SectionInfoTooltip
          title="Fund Overlap"
          formula={
            <>
              Overlap % = Σ min(Weight_A, Weight_B) for each common holding<br />
              Range: 0% (no overlap) to 100% (identical portfolios)
            </>
          }
          content={
            <>
              Overlap is how much of two funds&apos; portfolios is in the same stocks. High overlap means less diversification between those funds.
            </>
          }
        />
      </div>
      <WideCard className="overflow-hidden p-0">
        {hasData ? (
          <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted border-b border-border">
                    <TableHead className="text-[9px] font-bold uppercase tracking-wide px-2 py-1.5 sticky left-0 bg-muted z-20 min-w-[100px] border-r border-border/30">
                      Fund
                    </TableHead>
                    {fund_names.map((name, j) => (
                      <TableHead
                        key={fund_codes[j]}
                        className="text-[9px] font-bold uppercase tracking-wide px-1 py-1.5 text-center whitespace-nowrap min-w-[50px]"
                        title={name}
                      >
                        {abbreviate(name)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrix.map((row, i) => (
                    <TableRow key={fund_codes[i]} className="hover:bg-muted/30">
                      <TableCell
                        className="sticky left-0 bg-card border-r border-border/30 px-2 py-1.5 font-semibold text-foreground text-[10px] whitespace-nowrap min-w-[100px] truncate z-10"
                        title={fund_names[i]}
                      >
                        {abbreviate(fund_names[i])}
                      </TableCell>
                      {row.map((val, j) => {
                        const isDiagonal = i === j
                        const cellClass = isDiagonal
                          ? "bg-muted text-muted-foreground font-medium"
                          : overlapColor(val)

                        return (
                          <TableCell
                            key={j}
                            className={`px-1 py-1.5 text-center align-middle font-mono text-[10px] ${cellClass}`}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-block w-full h-full cursor-default">
                                  {isDiagonal ? "–" : `${val}%`}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[280px] bg-popover text-popover-foreground border border-border text-xs">
                                <p className="font-semibold text-xs mb-1">
                                  {fund_names[i]} vs {fund_names[j]}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {isDiagonal
                                    ? "Same fund"
                                    : `Overlap: ${val}%`}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No fund overlap data available. Upload a portfolio to see overlap analysis.</p>
            </div>
          )}
      </WideCard>
    </div>
  )
})
