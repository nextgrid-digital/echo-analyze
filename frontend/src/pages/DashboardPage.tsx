import { useAuth } from "@clerk/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { CircleAlert, X } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { AuthToolbar } from "@/components/auth/AuthToolbar"
import { Dashboard } from "@/components/dashboard/Dashboard"
import { Footer } from "@/components/dashboard/Footer"
import { WarningRail } from "@/components/dashboard/WarningRail"
import { Button } from "@/components/ui/button"
import { useSessionAccess } from "@/hooks/useSessionAccess"
import { createEmptySummary, createEmptyHoldings } from "@/lib/emptyData"
import { getDashboardMethodologyWarnings } from "@/lib/portfolioAnalysis"
import type { AnalysisResponse } from "@/types/api"

const MODAL_ANIMATION_MS = 220

export function DashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoaded, isSignedIn } = useAuth()
  const { session, loading: sessionLoading } = useSessionAccess()
  const [isNoticesModalMounted, setIsNoticesModalMounted] = useState(false)
  const [isNoticesModalVisible, setIsNoticesModalVisible] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const dashboardRef = useRef<HTMLDivElement>(null)

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

  const hasData = Boolean(result?.summary)
  const notices = useMemo(() => {
    const backendWarnings = displaySummary.warnings ?? []
    const clientWarnings = getDashboardMethodologyWarnings(displaySummary, displayHoldings)
    const merged = [...backendWarnings, ...clientWarnings]
    const seen = new Set<string>()

    return merged.filter((item) => {
      const key = `${item.section}|${item.severity}|${item.message}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }, [displayHoldings, displaySummary])

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

  const handleDownloadPDF = async () => {
    if (!dashboardRef.current) return
    setIsDownloading(true)

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ])

      // Delay to ensure all charts and assets are stable
      await new Promise(resolve => setTimeout(resolve, 500))

      // Identify all sections to capture
      const sections = Array.from(dashboardRef.current.querySelectorAll(".pdf-section"))
      if (sections.length === 0) {
        // Fallback to capturing the whole container if no sections tagged
        sections.push(dashboardRef.current)
      }

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      // Detect dashboard background color dynamically
      const rawBgColor = window.getComputedStyle(dashboardRef.current).backgroundColor
      // Fallback for oklch or weird color formats that html2canvas 1.x doesn't handle well
      const bgColor = (rawBgColor && !rawBgColor.includes("oklch")) ? rawBgColor : "#09090b"

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement

        // Dynamically determine capture width based on content (for wide tables)
        const captureWidth = Math.max(1400, section.scrollWidth)

        const canvas = await html2canvas(section, {
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: bgColor,
          allowTaint: true,
          windowWidth: captureWidth,
          width: captureWidth,
          ignoreElements: (el: Element) => el.classList.contains("no-print"),
          onclone: (clonedDoc: Document) => {
            const expandableElements = clonedDoc.querySelectorAll(".print-full-table, .overflow-auto, .overflow-y-auto")
            expandableElements.forEach((el: Element) => {
              const h = el as HTMLElement
              h.style.height = "auto"
              h.style.maxHeight = "none"
              h.style.overflow = "visible"
              h.style.width = "auto" // Ensure it takes full scroll width
              h.style.display = "block"
            })
          }
        })

        const imgData = canvas.toDataURL("image/jpeg", 0.85)
        const imgProps = pdf.getImageProperties(imgData)
        const renderHeight = (imgProps.height * pdfWidth) / imgProps.width

        let heightLeft = renderHeight
        let position = 0

        // If a section is taller than one PDF page, slice it across multiple pages
        while (heightLeft > 0) {
          if (i > 0 || position < 0) {
            pdf.addPage()
          }

          pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, renderHeight)

          heightLeft -= pdfHeight
          position -= pdfHeight
        }
      }

      pdf.save(`ECHO_Analysis_${displaySummary.statement_date || "Report"}.pdf`)
    } catch (error) {
      console.error("PDF generation failed:", error)
      // Final fallback to print if library fails
      window.print()
    } finally {
      setIsDownloading(false)
    }
  }

  useEffect(() => {
    if (!isLoaded || sessionLoading) {
      return
    }

    if (!isSignedIn || !result?.summary) {
      navigate("/", { replace: true })
    }
  }, [isLoaded, isSignedIn, navigate, result?.summary, sessionLoading])

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

  if (!isLoaded || sessionLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        Loading dashboard...
      </div>
    )
  }

  if (!isSignedIn || !hasData) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground" ref={dashboardRef} id="dashboard-capture-root">
      <div className="mb-4 px-4 sm:px-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-h-[44px]">
        <div className="pdf-section">
          <p className="text-foreground font-medium text-sm">
            Live portfolio valuation
          </p>
          <p className="text-muted-foreground text-xs">
            Statement date: {displaySummary.statement_date ?? "N/A"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 no-print">
          <AuthToolbar isAdmin={session?.is_admin ?? false} />
          <Button
            type="button"
            variant="default"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="min-h-[44px] sm:min-h-0 py-2 px-6 shadow-md shadow-primary/10 flex items-center gap-2"
          >
            {isDownloading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </div>
            ) : (
              <>
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
              </>
            )}
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

      {isNoticesModalMounted && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 no-print">
          <button
            type="button"
            className={`absolute inset-0 bg-black/45 transition-opacity duration-200 ease-out ${isNoticesModalVisible ? "opacity-100" : "opacity-0"
              }`}
            aria-label="Close Data Quality & Methodology Notices modal"
            onClick={closeNoticesModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Data Quality & Methodology Notices"
            className={`relative z-10 w-full max-w-4xl border border-border bg-background shadow-2xl max-h-[85vh] overflow-hidden transform transition-all duration-200 ease-out ${isNoticesModalVisible
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
              {notices.length > 0 ? (
                <WarningRail warnings={notices} className="mb-0" />
              ) : (
                <div className="border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  No data quality notices for this report.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <Dashboard summary={displaySummary} holdings={displayHoldings} />
      </div>
      <div className="pdf-section">
        <Footer />
      </div>
    </div>
  )
}
