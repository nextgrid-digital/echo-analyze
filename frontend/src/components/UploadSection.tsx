import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
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
  const [progress, setProgress] = useState(0)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

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
    setProgress(1) // Start at 1%
    onStart?.()

    // Simulate progress during API call
    let currentProgress = 1
    progressIntervalRef.current = setInterval(() => {
      if (currentProgress < 95) {
        // Increment progress more slowly as we approach 95%
        const increment = currentProgress < 50 ? 2 : currentProgress < 80 ? 1.5 : 0.8
        currentProgress = Math.min(currentProgress + increment, 95)
        setProgress(currentProgress)
      }
    }, 100) // Update every 100ms

    try {
      const result = await analyzePortfolio(selectedFile, password)
      
      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      
      // Complete progress to 100%
      setProgress(100)
      
      // Small delay to show 100% before showing data
      await new Promise(resolve => setTimeout(resolve, 300))
      
      if (!result.success) {
        setError(result.error ?? "Analysis failed.")
        setProgress(0)
        setLoading(false)
        return
      }
      if (!result.summary) {
        setError("Analysis returned no summary data.")
        setProgress(0)
        setLoading(false)
        return
      }
      onResult(result)
      // Reset progress after data is shown
      setTimeout(() => {
        setProgress(0)
        setLoading(false)
      }, 100)
    } catch (err) {
      // Clear progress interval on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setError(err instanceof Error ? err.message : "Connection error. Is the backend running?")
      setProgress(0)
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

      {loading && progress > 0 && (
        <div className="mb-8">
          <div className="mb-3">
            <p className="text-sm font-medium text-foreground">
              Analyzing your portfolio...
            </p>
          </div>
          <Progress variant="pill" value={progress} className="w-full" />
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
