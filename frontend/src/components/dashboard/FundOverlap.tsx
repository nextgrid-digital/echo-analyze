

import { memo, useRef } from "react"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"
import { WideCard } from "./cards/WideCard"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
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
  const matrixRef = useRef<HTMLDivElement>(null)

  const handleDownloadCSV = () => {
    // Header row: "Fund" followed by each fund name
    const headers = ["Fund", ...fund_names]

    const rows: string[][] = []

    matrix.forEach((row, i) => {
      const csvRow = [fund_names[i]]
      row.forEach((val, j) => {
        // Use raw value, diagonal is 100% or "-" representation, but CSV should be simple
        csvRow.push(i === j ? "100" : String(val))
      })
      rows.push(csvRow)
    })

    // Convert to CSV string: values are already numbers or simple strings, but quoting fund names is safer
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `fund_overlap_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadImage = async () => {
    if (!matrixRef.current) return
    try {
      const canvas = await html2canvas(matrixRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (document) => {
          // Hide buttons in the clone but keep the title
          const buttons = document.querySelectorAll(".no-print")
          buttons.forEach((b) => ((b as HTMLElement).style.display = "none"))

          // Ensure the table is fully expanded in the clone
          const tableContainer = document.querySelector(".overflow-x-auto")
          if (tableContainer) {
            (tableContainer as HTMLElement).style.overflow = "visible";
            (tableContainer as HTMLElement).style.width = "auto";
          }
        },
      })
      const image = canvas.toDataURL("image/png", 1.0)
      const link = document.createElement("a")
      link.href = image
      link.download = `fund_overlap_${new Date().toISOString().split("T")[0]}.png`
      link.click()
    } catch (error) {
      console.error("Failed to download image:", error)
    }
  }

  const handleDownloadPDF = async () => {
    if (!matrixRef.current) return
    try {
      const canvas = await html2canvas(matrixRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (document) => {
          const buttons = document.querySelectorAll(".no-print")
          buttons.forEach((b) => ((b as HTMLElement).style.display = "none"))

          const tableContainer = document.querySelector(".overflow-x-auto")
          if (tableContainer) {
            (tableContainer as HTMLElement).style.overflow = "visible";
            (tableContainer as HTMLElement).style.width = "auto";
          }
        },
      })
      const imgData = canvas.toDataURL("image/png")

      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgWidth = pdf.internal.pageSize.getWidth()
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
      pdf.save(`fund_overlap_${new Date().toISOString().split("T")[0]}.pdf`)
    } catch (error) {
      console.error("Failed to download PDF:", error)
    }
  }

  return (
    <div className="mb-6 sm:mb-8 bg-card border border-border p-4 sm:p-6 shadow-sm" ref={matrixRef}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Fund Overlap Analysis
        </h2>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleDownloadCSV}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 h-9 px-3 text-xs bg-black text-white hover:bg-black/90 font-bold shadow-md border-0"
              title="Download CSV"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </Button>
            <Button
              onClick={handleDownloadImage}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 h-9 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-md border-0"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
              <span>Download Image</span>
            </Button>
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 h-9 px-3 text-xs bg-red-600 text-white hover:bg-red-700 font-bold shadow-md border-0"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </Button>
          </div>

          <SectionInfoTooltip
            title="Fund Overlap"
            formula={
              <>
                Overlap % = Σ min(weight A, weight B) across common holdings
              </>
            }
            content={
              <>
                Shows stock-level overlap between your funds. Higher percentages mean the two funds hold more of the same underlying positions. Colors: Red (&gt;50%), Orange (30-50%), Yellow (15-30%), Green (&lt;15%).
              </>
            }
          />
        </div>
      </div>
      <WideCard className="overflow-hidden p-0 border-0 shadow-none">
        <div>
          {hasData ? (
            <div className="overflow-x-auto print-full-table">
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
        </div>
      </WideCard>
    </div>
  )
})
