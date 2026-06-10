import { memo, useRef } from "react"
import { Download } from "lucide-react"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { escapeCsvCell } from "@/lib/csv"
import type { OverlapData } from "@/types/api"

interface FundOverlapCardProps {
  overlap: OverlapData
}

function overlapColor(pct: number): string {
  if (pct >= 70) return "bg-red-600 text-white font-bold"
  if (pct >= 60) return "bg-red-500 text-white font-bold"
  if (pct >= 50) return "bg-red-400 text-white"
  if (pct >= 40) return "bg-orange-400 text-black font-semibold"
  if (pct >= 30) return "bg-yellow-400 text-black font-semibold"
  if (pct >= 20) return "bg-green-400 text-black"
  if (pct >= 10) return "bg-green-500 text-white"
  return "bg-green-600 text-white"
}

function abbreviate(name: string, maxLen = 10): string {
  const s = name
    .replace(/\s*-\s*Direct.*$/gi, "")
    .replace(/\s*-\s*Regular.*$/gi, "")
    .replace(/Direct Plan|Growth|Regular Plan/gi, "")
    .replace(/Mutual Fund/gi, "")
    .replace(/Fund/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  if (s.length <= maxLen) return s

  const words = s.split(" ")
  if (words.length >= 2) {
    const duo = `${words[0]} ${words[1]}`
    if (duo.length <= maxLen) return duo
  }

  return `${s.slice(0, maxLen - 1)}…`
}

export const FundOverlapCard = memo(function FundOverlapCard({ overlap }: FundOverlapCardProps) {
  const { fund_codes, fund_names, matrix } = overlap
  const n = fund_codes.length
  const hasData = n >= 2 && matrix.length >= 2
  const matrixRef = useRef<HTMLDivElement>(null)

  const handleDownloadCSV = () => {
    const headers = ["Fund", ...fund_names]
    const rows: string[][] = []

    matrix.forEach((row, i) => {
      const csvRow = [fund_names[i]]
      row.forEach((val, j) => {
        csvRow.push(i === j ? "100" : String(val))
      })
      rows.push(csvRow)
    })

    const csvContent = [
      headers.map(escapeCsvCell).join(","),
      ...rows.map((row) => row.map(escapeCsvCell).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `fund_overlap_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Fund Overlap Analysis</CardTitle>
            <CardDescription>
              Stock-level overlap between funds. Higher values mean more shared underlying holdings.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleDownloadCSV} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
            <SectionInfoTooltip
              title="Fund Overlap"
              formula={<>Overlap % = Sum min(weight A, weight B) across common holdings</>}
              content={
                <>
                  Colors: Red (&gt;50%), Orange (30–50%), Yellow (15–30%), Green (&lt;15%).
                </>
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent ref={matrixRef}>
        {hasData ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="sticky left-0 z-20 min-w-[100px] bg-muted">Fund</TableHead>
                  {fund_names.map((name, j) => (
                    <TableHead
                      key={fund_codes[j]}
                      className="min-w-[50px] text-center text-xs"
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
                      className="sticky left-0 z-10 min-w-[100px] truncate bg-card font-medium"
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
                          className={`px-1 py-1.5 text-center align-middle font-mono text-xs ${cellClass}`}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block w-full cursor-default">
                                {isDiagonal ? "—" : `${val}%`}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[280px] text-xs">
                              <p className="mb-1 font-semibold">
                                {fund_names[i]} vs {fund_names[j]}
                              </p>
                              <p className="text-muted-foreground">
                                {isDiagonal ? "Same fund" : `Overlap: ${val}%`}
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
          <p className="py-8 text-center text-sm text-muted-foreground">
            No fund overlap data available. Upload a portfolio to see overlap analysis.
          </p>
        )}
      </CardContent>
    </Card>
  )
})
