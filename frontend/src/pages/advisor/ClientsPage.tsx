import { Link, useNavigate } from "react-router-dom"
import { AdvisorShellPage } from "@/components/advisor/AdvisorShellPage"
import { ClientBookTable } from "@/components/advisor/ClientBookTable"
import { useAdvisorClients } from "@/hooks/useAdvisorClients"
import { setActiveClientPan } from "@/lib/activeClient"
import { buildClientWorkspacePath } from "@/lib/clientWorkspace"

export function ClientsPage() {
  const navigate = useNavigate()
  const { clients, refreshClients } = useAdvisorClients()

  const openClient = (pan: string) => {
    setActiveClientPan(pan)
    navigate(buildClientWorkspacePath(pan))
  }

  return (
    <AdvisorShellPage
      title="Clients"
      description="Your advisor book — clients with uploaded CAS reports"
    >
      <ClientBookTable
        clients={clients}
        onClientClick={openClient}
        onClientDeleted={refreshClients}
        uploadHref="/upload"
        title="All clients"
        description="Clients with analyzed CAS reports"
        emptyMessage="No clients yet. Upload a CAS report to add your first client."
      />
      {clients.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          You can also upload from the{" "}
          <Link to="/dashboard" className="font-medium text-primary hover:underline">
            dashboard
          </Link>
          .
        </p>
      )}
    </AdvisorShellPage>
  )
}
