import { useCallback, useState } from "react"
import { UploadSection } from "@/components/UploadSection"
import { Dashboard } from "@/components/dashboard/Dashboard"
import { Button } from "@/components/ui/button"
import type { AnalysisResponse } from "@/types/api"
import "./App.css"

function App() {
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const handleResult = useCallback((res: AnalysisResponse) => setResult(res), [])

  if (result?.summary) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mb-4 px-4 sm:px-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-h-[44px]">
          <p className="text-muted-foreground font-medium text-sm">
            Portfolio as on {result.summary.statement_date ?? "N/A"}
          </p>
          <Button
            type="button"
            variant="link"
            onClick={() => setResult(null)}
            className="text-primary hover:text-primary/90 min-h-[44px] sm:min-h-0 py-2"
          >
            Upload another
          </Button>
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
      <UploadSection onResult={handleResult} />
    </div>
  )
}

export default App
