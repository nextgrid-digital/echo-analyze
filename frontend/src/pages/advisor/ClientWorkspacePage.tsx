import { useMemo, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { AdvisorShellPage } from "@/components/advisor/AdvisorShellPage"
import { ClientCasUploadDialog } from "@/components/advisor/ClientCasUploadDialog"
import { ClientHeader } from "@/components/advisor/ClientHeader"
import { ClientWorkspaceTabs } from "@/components/advisor/ClientWorkspaceTabs"
import { PrepareReviewDialog } from "@/components/advisor/PrepareReviewDialog"
import { ShareReviewDialog } from "@/components/advisor/ShareReviewDialog"
import { WarningRail } from "@/components/dashboard/WarningRail"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getDashboardMethodologyWarnings } from "@/lib/portfolioAnalysis"
import { buildClientWorkspacePath } from "@/lib/clientWorkspace"
import { useClientAnalysis } from "@/hooks/useClientAnalysis"

export function ClientWorkspacePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const validTabs = new Set(["overview", "holdings", "performance", "risk", "notes", "reviews"])
  const defaultTab = tabParam && validTabs.has(tabParam) ? tabParam : "overview"
  const [noticesOpen, setNoticesOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [prepareOpen, setPrepareOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const workspaceRef = useRef<HTMLDivElement>(null)

  const { summary, holdings, hydrated, hasData, clientPan, staleAnalysis, refreshAnalysis } =
    useClientAnalysis()

  const notices = useMemo(() => {
    const backendWarnings = summary.warnings ?? []
    const clientWarnings = getDashboardMethodologyWarnings(summary, holdings)
    const merged = [...backendWarnings, ...clientWarnings]
    const seen = new Set<string>()
    return merged.filter((item) => {
      const key = `${item.section}|${item.severity}|${item.message}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [holdings, summary])

  const handleDownloadPdfInline = async () => {
    navigate("/dashboard/report")
    setIsDownloading(true)
    setTimeout(() => setIsDownloading(false), 500)
  }

  const handleUploadSuccess = (pan: string) => {
    setUploadOpen(false)
    refreshAnalysis()
    if (clientPan && pan !== clientPan) {
      navigate(buildClientWorkspacePath(pan))
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Loading client workspace...
      </div>
    )
  }

  if (!hasData) {
    return (
      <AdvisorShellPage>
        <div className="mx-auto flex max-w-lg flex-col items-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">Client not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload a CAS report from the dashboard or select a client from your book.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard">Upload CAS</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/clients">View clients</Link>
            </Button>
          </div>
        </div>
      </AdvisorShellPage>
    )
  }

  return (
    <AdvisorShellPage
      captureRef={workspaceRef}
      captureId="dashboard-capture-root"
      scrollable
    >
      <Dialog open={noticesOpen} onOpenChange={setNoticesOpen}>
        <DialogContent className="no-print max-h-[85vh] max-w-4xl gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
            <DialogTitle>Data Quality & Methodology Notices</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(85vh-5rem)] overflow-y-auto p-4 sm:p-6">
            {notices.length > 0 ? (
              <WarningRail warnings={notices} className="mb-0" />
            ) : (
              <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No data quality notices for this report.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ClientCasUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        clientPan={clientPan}
        clientName={summary.investor_info?.name?.trim() || "Client"}
        onSuccess={handleUploadSuccess}
      />

      <ShareReviewDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        clientPan={clientPan ?? ""}
        clientName={summary.investor_info?.name?.trim() || "Client"}
      />

      <PrepareReviewDialog
        open={prepareOpen}
        onOpenChange={setPrepareOpen}
        clientPan={clientPan ?? ""}
        clientName={summary.investor_info?.name?.trim() || "Client"}
      />

      <DeleteClientDialog
        client={
          clientPan
            ? {
                pan: clientPan,
                name: summary.investor_info?.name?.trim() || "Client",
              }
            : null
        }
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => navigate("/clients")}
      />

      <ClientHeader
        summary={summary}
        onDownloadPdf={handleDownloadPdfInline}
        onOpenNotices={() => setNoticesOpen(true)}
        onDeleteClient={() => setDeleteOpen(true)}
        onUploadCas={() => setUploadOpen(true)}
        onPrepareReview={() => setPrepareOpen(true)}
        onShareReview={() => setShareOpen(true)}
        isDownloading={isDownloading}
      />

      {staleAnalysis ? (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          This portfolio was analyzed with an older Echo version. Re-upload the CAS to refresh performance
          metrics (XIRR, missed gains, and benchmark comparison).
        </div>
      ) : null}

      <ClientWorkspaceTabs
        summary={summary}
        holdings={holdings}
        defaultTab={defaultTab}
        clientPan={clientPan}
      />
    </AdvisorShellPage>
  )
}
