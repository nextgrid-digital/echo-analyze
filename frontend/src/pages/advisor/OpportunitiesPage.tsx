import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AdvisorShellPage } from "@/components/advisor/AdvisorShellPage"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAdvisorClients } from "@/hooks/useAdvisorClients"
import {
  aggregateOpportunityValue,
  countByPriority,
  detectBookOpportunities,
  getOpportunityLabel,
  sortOpportunities,
} from "@/lib/opportunities/opportunityEngine"
import { buildClientWorkspacePath } from "@/lib/clientWorkspace"

function formatInr(value: number) {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`
  return `₹${value.toLocaleString("en-IN")}`
}

export function OpportunitiesPage() {
  const navigate = useNavigate()
  const { clients } = useAdvisorClients()

  const opportunities = useMemo(
    () => sortOpportunities(detectBookOpportunities(clients)),
    [clients],
  )

  const totalValue = aggregateOpportunityValue(opportunities)
  const highPriority = countByPriority(opportunities, "high")

  return (
    <AdvisorShellPage title="Opportunities">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Potential Opportunity Value</CardDescription>
              <CardTitle className="text-2xl">{formatInr(totalValue)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>High Priority</CardDescription>
              <CardTitle className="text-2xl">{highPriority}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Clients in Book</CardDescription>
              <CardTitle className="text-2xl">{clients.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Opportunities</CardDescription>
              <CardTitle className="text-2xl">{opportunities.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opportunity Pipeline</CardTitle>
            <CardDescription>Rule-based signals across your client book.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Upload client CAS statements to surface opportunities.
              </p>
            ) : (
              opportunities.map((item) => (
                <button
                  key={`${item.clientPan}-${item.type}`}
                  type="button"
                  className="flex w-full items-start justify-between gap-4 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  onClick={() => navigate(buildClientWorkspacePath(item.clientPan))}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.clientName}</span>
                      <Badge variant={item.priority === "high" ? "destructive" : "secondary"}>
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{getOpportunityLabel(item.type)}</p>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                    <p className="text-xs text-muted-foreground">{item.suggestedAction}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{formatInr(item.potentialAmount)}</p>
                    <ArrowRight className="ml-auto mt-2 h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdvisorShellPage>
  )
}
