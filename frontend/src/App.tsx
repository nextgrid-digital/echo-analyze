import { useCallback, useState } from "react"
import { UploadSection } from "@/components/UploadSection"
import { Dashboard } from "@/components/dashboard/Dashboard"
import type { AnalysisResponse } from "@/types/api"
import "./App.css"

function App() {
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const handleResult = useCallback((res: AnalysisResponse) => setResult(res), [])

  if (result?.summary) {
    return (
      <div className="min-h-screen bg-[#fbfcff] text-slate-800">
        <div className="mb-4 px-4 sm:px-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-h-[44px]">
          <p className="text-slate-400 font-medium text-sm">
            Portfolio as on {result.summary.statement_date ?? "N/A"}
          </p>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 min-h-[44px] sm:min-h-0 py-2"
          >
            Upload another
          </button>
        </div>
        <Dashboard
          summary={result.summary}
          holdings={result.holdings ?? []}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fbfcff] text-slate-800">
      <UploadSection onResult={handleResult} />
    </div>
  )
}

export default App
