import { useMemo, useState } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { Calendar, Sparkles, Upload } from "lucide-react"
import { AdvisorShellPage } from "@/components/advisor/AdvisorShellPage"
import { CasUploadPanel } from "@/components/upload/CasUploadPanel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/auth/useAuth"
import { useAdvisorClients } from "@/hooks/useAdvisorClients"
import {
  aggregateOpportunityValue,
  countByPriority,
  detectBookOpportunities,
  getOpportunityLabel,
  sortOpportunities,
} from "@/lib/opportunities/opportunityEngine"
import { buildClientWorkspacePath } from "@/lib/clientWorkspace"
import { setActiveClientPan } from "@/lib/activeClient"

function formatInr(value: number) {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`
  return `₹${value.toLocaleString("en-IN")}`
}

function greetingName(user: ReturnType<typeof useAuth>["user"]) {
  const metadata = user?.user_metadata as Record<string, unknown> | undefined
  const fullName = typeof metadata?.full_name === "string" ? metadata.full_name : null
  if (fullName) return fullName.split(" ")[0]
  const email = user?.email?.split("@")[0]
  return email ?? "Advisor"
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const panParam = searchParams.get("pan")
  const { user } = useAuth()
  const { clients, refreshClients } = useAdvisorClients()
  const [uploadOpen, setUploadOpen] = useState(false)

  if (panParam) {
    return <Navigate to={buildClientWorkspacePath(panParam)} replace />
  }

  const bookMetrics = useMemo(() => {
    const totalValue = clients.reduce(
      (sum, client) => sum + (client.analysis.summary?.total_market_value ?? 0),
      0,
    )
    const reviewsDue = clients.filter((client) => {
      const updated = new Date(client.updatedAt)
      const monthsAgo = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24 * 30)
      return monthsAgo >= 6
    }).length
    return { totalValue, reviewsDue }
  }, [clients])

  const opportunities = useMemo(
    () => sortOpportunities(detectBookOpportunities(clients)).slice(0, 5),
    [clients],
  )
  const opportunityValue = aggregateOpportunityValue(detectBookOpportunities(clients))
  const highPriority = countByPriority(detectBookOpportunities(clients), "high")

  const recentClients = useMemo(
    () => [...clients].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [clients],
  )

  const openClient = (pan: string) => {
    setActiveClientPan(pan)
    navigate(buildClientWorkspacePath(pan))
  }

  return (
    <AdvisorShellPage>
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section className="space-y-2">
          <p className="text-sm text-muted-foreground">Good morning, {greetingName(user)}</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Advisor Home</h1>
          <p className="text-sm text-muted-foreground">
            Prepare reviews, share client links, and act on opportunities across your book.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Clients</CardDescription>
              <CardTitle className="text-2xl">{clients.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Portfolio Value</CardDescription>
              <CardTitle className="text-2xl">{formatInr(bookMetrics.totalValue)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Reviews Due</CardDescription>
              <CardTitle className="text-2xl">{bookMetrics.reviewsDue}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Opportunity Value</CardDescription>
              <CardTitle className="text-2xl">{formatInr(opportunityValue)}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Opportunities</CardTitle>
              <CardDescription>{highPriority} high priority across your book</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {opportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Upload CAS files to detect opportunities.</p>
              ) : (
                opportunities.map((item) => (
                  <button
                    key={`${item.clientPan}-${item.type}`}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/40"
                    onClick={() => openClient(item.clientPan)}
                  >
                    <span>
                      <span className="font-medium">{item.clientName}</span>
                      <span className="block text-muted-foreground">{getOpportunityLabel(item.type)}</span>
                    </span>
                    <span className="font-medium">{formatInr(item.potentialAmount)}</span>
                  </button>
                ))
              )}
              <Button variant="outline" size="sm" asChild>
                <Link to="/opportunities">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Open Opportunities
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Client Activity</CardTitle>
              <CardDescription>Latest CAS uploads and workspace updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No clients yet.</p>
              ) : (
                recentClients.map((client) => (
                  <button
                    key={client.pan}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/40"
                    onClick={() => openClient(client.pan)}
                  >
                    <span>
                      <span className="font-medium">{client.name}</span>
                      <span className="block text-muted-foreground">
                        Updated {new Date(client.updatedAt).toLocaleDateString("en-IN")}
                      </span>
                    </span>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))
              )}
              <Button variant="outline" size="sm" asChild>
                <Link to="/clients">View all clients</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-2xl border bg-muted/20 p-6">
          <h2 className="text-base font-semibold">Quick Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload CAS
            </Button>
            <Button variant="outline" asChild>
              <Link to="/clients">Prepare Review</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/clients">Share Review</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/clients">View Clients</Link>
            </Button>
          </div>
        </section>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload CAS</DialogTitle>
          </DialogHeader>
          <CasUploadPanel
            onClientStored={refreshClients}
            onAnalysisComplete={(pan) => {
              setUploadOpen(false)
              openClient(pan)
            }}
          />
        </DialogContent>
      </Dialog>
    </AdvisorShellPage>
  )
}
