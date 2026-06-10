import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Download } from "lucide-react"
import { AdvisorShellPage } from "@/components/advisor/AdvisorShellPage"
import { Dashboard } from "@/components/dashboard/Dashboard"
import { Footer } from "@/components/dashboard/Footer"
import { Button } from "@/components/ui/button"
import { buildDashboardPdfFilename } from "@/lib/downloadFilename"
import { useClientAnalysis } from "@/hooks/useClientAnalysis"

export function ReportPage() {
  const navigate = useNavigate()
  const [isDownloading, setIsDownloading] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const { summary, holdings, hydrated, hasData } = useClientAnalysis()

  useEffect(() => {
    if (hydrated && !hasData) {
      navigate("/", { replace: true })
    }
  }, [hasData, hydrated, navigate])

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return
    setIsDownloading(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ])
      await new Promise((resolve) => setTimeout(resolve, 500))
      const sections = Array.from(reportRef.current.querySelectorAll(".pdf-section"))
      if (sections.length === 0) sections.push(reportRef.current)
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const rawBgColor = window.getComputedStyle(reportRef.current).backgroundColor
      const bgColor = rawBgColor && !rawBgColor.includes("oklch") ? rawBgColor : "#09090b"

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement
        const canvas = await html2canvas(section, {
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: bgColor,
          ignoreElements: (el) => el.classList.contains("no-print"),
        })
        const imgData = canvas.toDataURL("image/jpeg", 0.85)
        const imgProps = pdf.getImageProperties(imgData)
        const renderHeight = (imgProps.height * pdfWidth) / imgProps.width
        let heightLeft = renderHeight
        let position = 0
        while (heightLeft > 0) {
          if (i > 0 || position < 0) pdf.addPage()
          pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, renderHeight)
          heightLeft -= pdfHeight
          position -= pdfHeight
        }
      }
      pdf.save(buildDashboardPdfFilename(summary.statement_date))
    } catch (error) {
      console.error("PDF generation failed:", error)
      window.print()
    } finally {
      setIsDownloading(false)
    }
  }

  const headerActions = (
    <Button size="sm" onClick={handleDownloadPDF} disabled={isDownloading}>
      <Download className="mr-2 h-4 w-4" />
      {isDownloading ? "Generating..." : "Download PDF"}
    </Button>
  )

  if (!hydrated || !hasData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        Loading report...
      </div>
    )
  }

  return (
    <AdvisorShellPage
      title="Full Portfolio Report"
      description="Complete analytics report for PDF export"
      headerActions={headerActions}
      captureRef={reportRef}
      captureId="dashboard-capture-root"
      scrollable={false}
    >
      <Dashboard summary={summary} holdings={holdings} />
      <div className="pdf-section">
        <Footer />
      </div>
    </AdvisorShellPage>
  )
}
