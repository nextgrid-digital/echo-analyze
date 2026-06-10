import { Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { AdvisorShellPage } from "@/components/advisor/AdvisorShellPage"
import { ClientBookTable } from "@/components/advisor/ClientBookTable"
import { CasUploadPanel } from "@/components/upload/CasUploadPanel"
import { useAdvisorClients } from "@/hooks/useAdvisorClients"
import { setActiveClientPan } from "@/lib/activeClient"
import { buildClientWorkspacePath } from "@/lib/clientWorkspace"

export function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const panParam = searchParams.get("pan")
  const { clients, refreshClients } = useAdvisorClients()

  if (panParam) {
    return <Navigate to={buildClientWorkspacePath(panParam)} replace />
  }

  const openClient = (pan: string) => {
    setActiveClientPan(pan)
    navigate(buildClientWorkspacePath(pan))
  }

  return (
    <AdvisorShellPage>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Upload CAS</h1>
          <p className="text-sm text-muted-foreground">
            Add multiple CAMS/CAS PDFs at once — enter a password for each file if needed.
            All analyzed reports appear in your book below.
          </p>
        </div>

        <CasUploadPanel
          onClientStored={refreshClients}
          onAnalysisComplete={openClient}
          showViewPortfolioButton
        />

        <ClientBookTable
          clients={clients}
          onClientClick={openClient}
          onClientDeleted={refreshClients}
          uploadHref="/dashboard"
          emptyMessage="No CAS reports yet. Upload your first report above."
        />
      </div>
    </AdvisorShellPage>
  )
}
