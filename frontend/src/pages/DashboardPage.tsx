import { useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Dashboard } from "@/components/dashboard/Dashboard"
import { Footer } from "@/components/dashboard/Footer"
import { Button } from "@/components/ui/button"
import { createEmptySummary, createEmptyHoldings } from "@/lib/emptyData"
import type { AnalysisResponse } from "@/types/api"

export function DashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get analysis result from route state
  const routeState = location.state as { result?: AnalysisResponse } | null
  const result = routeState?.result

  // Use real data if available, otherwise use empty data
  const displaySummary = useMemo(
    () => result?.summary ?? createEmptySummary(),
    [result?.summary]
  )
  const displayHoldings = useMemo(
    () => result?.holdings ?? createEmptyHoldings(),
    [result?.holdings]
  )

  const hasData = result?.summary !== null && result?.summary !== undefined

  return (
    <div className="min-h-screen bg-background text-foreground">
      {hasData && (
        <div className="mb-4 px-4 sm:px-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-h-[44px] no-print">
          <p className="text-muted-foreground font-medium text-sm">
            Portfolio as on {displaySummary.statement_date ?? "N/A"}
          </p>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="default"
              onClick={() => window.print()}
              className="min-h-[44px] sm:min-h-0 py-2 px-6 shadow-md shadow-primary/10 flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              Download Dashboard PDF
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => navigate("/")}
              className="text-primary hover:text-primary/90 min-h-[44px] sm:min-h-0 py-2"
            >
              Upload another
            </Button>
          </div>
        </div>
      )}
      <Dashboard summary={displaySummary} holdings={displayHoldings} />
      <Footer />
    </div>
  )
}
