import { useCallback, useState } from "react"
import { UploadSection } from "@/components/UploadSection"
import { Dashboard, SkeletonDashboard } from "@/components/dashboard/Dashboard"
import { Button } from "@/components/ui/button"
import type { AnalysisResponse } from "@/types/api"
import "./App.css"

function App() {
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const handleResult = useCallback((res: AnalysisResponse) => {
    setResult(res)
    setLoading(false)
  }, [])

  const handleStart = useCallback(() => {
    setLoading(true)
    setResult(null)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mb-4 px-4 sm:px-6 pt-4 flex flex-col sm:items-start min-h-[44px]">
          <p className="text-muted-foreground font-medium text-sm animate-pulse">
            Analyzing your portfolio...
          </p>
        </div>
        <SkeletonDashboard />
      </div>
    )
  }

  if (result?.summary) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mb-4 px-4 sm:px-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-h-[44px]">
          <p className="text-muted-foreground font-medium text-sm no-print">
            Portfolio as on {result.summary.statement_date ?? "N/A"}
          </p>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="default"
              onClick={() => window.print()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] sm:min-h-0 py-2 px-6 shadow-lg shadow-primary/20 flex items-center gap-2 no-print"
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
              onClick={() => setResult(null)}
              className="text-primary hover:text-primary/90 min-h-[44px] sm:min-h-0 py-2 no-print"
            >
              Upload another
            </Button>
          </div>
        </div>
        <Dashboard
          summary={result.summary}
          holdings={result.holdings ?? []}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <UploadSection onResult={handleResult} onStart={handleStart} />
    </div>
  )
}

export default App
