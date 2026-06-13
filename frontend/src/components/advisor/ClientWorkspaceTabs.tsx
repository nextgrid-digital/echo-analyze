import { HoldingsTable } from "@/components/dashboard/HoldingsTable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClientNotesTab } from "./ClientNotesTab"
import { ClientReviewHistoryTab } from "./ClientReviewHistoryTab"
import { ClientOverview } from "./ClientOverview"
import { ClientPerformanceTab } from "./ClientPerformanceTab"
import { ClientRiskTab } from "./ClientRiskTab"
import type { AnalysisSummary, Holding } from "@/types/api"

interface ClientWorkspaceTabsProps {
  summary: AnalysisSummary
  holdings: Holding[]
  defaultTab?: string
  clientPan?: string
}

const VALID_TABS = new Set(["overview", "holdings", "performance", "risk", "notes", "reviews"])

export function ClientWorkspaceTabs({
  summary,
  holdings,
  defaultTab = "overview",
  clientPan,
}: ClientWorkspaceTabsProps) {
  const activeTab = VALID_TABS.has(defaultTab) ? defaultTab : "overview"

  return (
    <Tabs defaultValue={activeTab} className="w-full">
      <TabsList className="mb-6 h-auto w-fit flex-wrap gap-1">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="holdings">Holdings</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        <TabsTrigger value="risk">Risk &amp; Allocation</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <ClientOverview summary={summary} holdings={holdings} />
      </TabsContent>

      <TabsContent value="holdings" className="space-y-4">
        <HoldingsTable
          holdings={holdings}
          totalMarketValue={summary.total_market_value}
          defaultShowDetails
        />
      </TabsContent>

      <TabsContent value="performance" className="space-y-6">
        <ClientPerformanceTab summary={summary} holdings={holdings} />
      </TabsContent>

      <TabsContent value="risk" className="space-y-6">
        <ClientRiskTab summary={summary} holdings={holdings} />
      </TabsContent>

      <TabsContent value="notes" className="space-y-6">
        <ClientNotesTab clientPan={clientPan} />
      </TabsContent>

      <TabsContent value="reviews" className="space-y-6">
        <ClientReviewHistoryTab clientPan={clientPan} />
      </TabsContent>
    </Tabs>
  )
}
