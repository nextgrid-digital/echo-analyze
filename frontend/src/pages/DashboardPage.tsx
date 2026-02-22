import { useEffect, useMemo, useState } from "react"
import { CircleAlert, X } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { Dashboard } from "@/components/dashboard/Dashboard"
import { Footer } from "@/components/dashboard/Footer"
import { WarningRail } from "@/components/dashboard/WarningRail"
import { Button } from "@/components/ui/button"
import { createEmptySummary, createEmptyHoldings } from "@/lib/emptyData"
import type { AnalysisResponse } from "@/types/api"

const MODAL_ANIMATION_MS = 220

export function DashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isNoticesModalMounted, setIsNoticesModalMounted] = useState(false)
  const [isNoticesModalVisible, setIsNoticesModalVisible] = useState(false)
  
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
  const warnings = displaySummary.warnings ?? []

  const openNoticesModal = () => {
    if (isNoticesModalMounted) {
      setIsNoticesModalVisible(true)
      return
    }
    setIsNoticesModalMounted(true)
    requestAnimationFrame(() => setIsNoticesModalVisible(true))
  }

  const closeNoticesModal = () => {
    setIsNoticesModalVisible(false)
  }

  useEffect(() => {
    if (!isNoticesModalMounted) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNoticesModal()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isNoticesModalMounted])

  useEffect(() => {
    if (!isNoticesModalMounted || isNoticesModalVisible) return
    const timeoutId = window.setTimeout(() => {
      setIsNoticesModalMounted(false)
    }, MODAL_ANIMATION_MS)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isNoticesModalMounted, isNoticesModalVisible])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {hasData && (
        <div className="mb-4 px-4 sm:px-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-h-[44px] no-print">
          <p className="text-muted-foreground font-medium text-sm">
            Portfolio as on {displaySummary.statement_date ?? "N/A"}
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
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
              variant="outline"
              onClick={openNoticesModal}
              className="min-h-[44px] sm:min-h-0 py-2 px-4 flex items-center gap-2"
            >
              <CircleAlert className="w-4 h-4" />
              Data Quality & Methodology Notices
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

      {hasData && isNoticesModalMounted && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 no-print">
          <button
            type="button"
            className={`absolute inset-0 bg-black/45 transition-opacity duration-200 ease-out ${
              isNoticesModalVisible ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Close Data Quality & Methodology Notices modal"
            onClick={closeNoticesModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Data Quality & Methodology Notices"
            className={`relative z-10 w-full max-w-4xl border border-border bg-background shadow-2xl max-h-[85vh] overflow-hidden transform transition-all duration-200 ease-out ${
              isNoticesModalVisible
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-3 scale-[0.98]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border px-4 sm:px-6 py-3">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Data Quality & Methodology Notices
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={closeNoticesModal}
                aria-label="Close Data Quality & Methodology Notices modal"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(85vh-72px)]">
              {warnings.length > 0 ? (
                <WarningRail warnings={warnings} className="mb-0" />
              ) : (
                <div className="border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  No data quality notices for this report.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Dashboard summary={displaySummary} holdings={displayHoldings} />
      <Footer />
    </div>
  )
}
