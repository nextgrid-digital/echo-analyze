import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { analyzePortfolio } from "@/api/analyze"
import type { AnalysisResponse } from "@/types/api"

interface UploadSectionProps {
  onResult: (result: AnalysisResponse) => void
  onStart?: () => void
}

export function UploadSection({ onResult, onStart }: UploadSectionProps) {
  const [password, setPassword] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedFile) {
      setError("Please select a CAS PDF or JSON file.")
      return
    }
    const isPdf = selectedFile.name.toLowerCase().endsWith(".pdf")
    if (isPdf && !password.trim()) {
      setError("Password is required for PDF files. CAS PDFs are usually protected with your PAN (e.g. ABCDE1234F).")
      return
    }
    setLoading(true)
    onStart?.()
    try {
      const result = await analyzePortfolio(selectedFile, password)
      if (!result.success) {
        setError(result.error ?? "Analysis failed.")
        return
      }
      if (!result.summary) {
        setError("Analysis returned no summary data.")
        return
      }
      onResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection error. Is the backend running?")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
      <div className="flex justify-between items-center mb-8 sm:mb-12 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Portfolio <span className="text-primary">Overview</span>
          </h1>
          <p className="text-muted-foreground font-medium mt-1 text-sm">
            Upload CAS PDF or JSON to view insights
          </p>
        </div>

        <Card className="border-border w-full sm:w-auto">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Select Statement
                </Label>
                <Input
                  type="file"
                  accept=".pdf,.json"
                  className="w-full sm:w-64 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    setSelectedFile(f ?? null)
                  }}
                />
                {selectedFile && (
                  <p className="text-[10px] text-primary font-bold">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Password
                </Label>
                <Input
                  type="password"
                  placeholder="Required for PDFs"
                  className="w-full sm:w-40 text-xs"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? "Processing..." : "Analyze Portfolio"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="space-y-4 mb-8">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
