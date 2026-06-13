import { Link } from "react-router-dom"
import type { MouseEventHandler } from "react"
import {
  Download,
  MoreHorizontal,
  Star,
  Trash2,
  Upload,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { computeRiskScore } from "@/lib/riskScore"
import { formatPercent } from "@/lib/format"
import type { AnalysisSummary } from "@/types/api"

function formatAum(value: number) {
  if (value >= 100_000) {
    return `₹${(value / 100_000).toFixed(2)} Cr`
  }
  return `₹${value.toLocaleString("en-IN")}`
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

interface ClientHeaderProps {
  summary: AnalysisSummary
  onDownloadPdf?: () => void
  onOpenNotices?: () => void
  onDeleteClient?: () => void
  onUploadCas?: MouseEventHandler<HTMLButtonElement>
  onPrepareReview?: () => void
  onShareReview?: () => void
  isDownloading?: boolean
}

export function ClientHeader({
  summary,
  onDownloadPdf,
  onOpenNotices,
  onDeleteClient,
  onUploadCas,
  onPrepareReview,
  onShareReview,
  isDownloading = false,
}: ClientHeaderProps) {
  const name = summary.investor_info?.name?.trim() || "Client"
  const { label: riskLabel } = computeRiskScore(summary)
  const since = summary.statement_date ?? "—"

  return (
    <div className="mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{name}</h1>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Favorite">
                <Star className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>AUM: {formatAum(summary.total_market_value)}</span>
              <span>Since {since}</span>
              <span>Risk Profile: {riskLabel}</span>
              {summary.portfolio_xirr != null && (
                <span>XIRR: {formatPercent(summary.portfolio_xirr)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onPrepareReview ? (
            <Button size="sm" type="button" onClick={onPrepareReview}>
              Prepare Review
            </Button>
          ) : null}
          {onShareReview ? (
            <Button variant="secondary" size="sm" type="button" onClick={onShareReview}>
              Share Review
            </Button>
          ) : null}
          <Button variant="outline" size="sm" type="button" onClick={onUploadCas}>
            <Upload className="mr-2 h-4 w-4" />
            Upload CAS
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDownloadPdf && (
                <DropdownMenuItem onClick={onDownloadPdf} disabled={isDownloading}>
                  <Download className="mr-2 h-4 w-4" />
                  {isDownloading ? "Generating PDF..." : "Download PDF"}
                </DropdownMenuItem>
              )}
              {onOpenNotices && (
                <DropdownMenuItem onClick={onOpenNotices}>View notices</DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to="/dashboard/report">Full report</Link>
              </DropdownMenuItem>
              {onDeleteClient && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDeleteClient}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete client
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {summary.performance_summary?.one_year.underperforming_pct != null &&
            summary.performance_summary.one_year.underperforming_pct > 30 && (
              <Badge variant="destructive" className="hidden sm:inline-flex">
                High underperformance
              </Badge>
            )}
        </div>
      </div>
    </div>
  )
}
