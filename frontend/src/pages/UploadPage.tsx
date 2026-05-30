import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { analyzePortfolio } from "@/api/analyze"
import { AuthPanel } from "@/auth/AuthPage"
import { useAuth } from "@/auth/useAuth"
import { AdminAccessToolbar } from "@/components/AdminAccessToolbar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { storeLatestAnalysis } from "@/lib/analysisSession"
import type { AnalysisResponse } from "@/types/api"
import { ArrowRight, Lock, Upload } from "lucide-react"

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

export function UploadPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [password, setPassword] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isLocked = !user

  const selectFile = (file: File) => {
    const lowerName = file.name.toLowerCase()
    const isSupported = lowerName.endsWith(".pdf") || lowerName.endsWith(".json")
    if (!isSupported) {
      setSelectedFile(null)
      setPassword("")
      setError("Please select a PDF or JSON file.")
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setSelectedFile(null)
      setPassword("")
      setError("File is too large. Maximum supported size is 25 MB.")
      return
    }

    setSelectedFile(file)
    if (!lowerName.endsWith(".pdf")) {
      setPassword("")
    }
    setError(null)
  }

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isLocked) {
      return
    }
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isLocked) {
      return
    }
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (isLocked) {
      return
    }

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      selectFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) {
      return
    }

    const file = e.target.files?.[0]
    if (file) {
      selectFile(file)
    }
  }

  const handleAnalyze = async () => {
    if (isLocked) {
      setError("Sign in or create an account to analyze CAS reports.")
      return
    }

    if (!selectedFile) {
      setError("Please select a CAS PDF or JSON file.")
      return
    }

    setError(null)
    setLoading(true)
    setProgress(1)
    setAnalysisComplete(false)

    let currentProgress = 1
    progressIntervalRef.current = setInterval(() => {
      if (currentProgress < 95) {
        const increment = currentProgress < 50 ? 2 : currentProgress < 80 ? 1.5 : 0.8
        currentProgress = Math.min(currentProgress + increment, 95)
        setProgress(currentProgress)
      }
    }, 100)

    try {
      const result = await analyzePortfolio(selectedFile, password)

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }

      setProgress(100)
      await new Promise((resolve) => setTimeout(resolve, 300))

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

      setAnalysisResult(result)
      storeLatestAnalysis(result)
      setAnalysisComplete(true)
      setLoading(false)
    } catch (err) {
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
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-6xl mx-auto">
        {user && (
          <div className="mb-8 flex justify-end">
          <AdminAccessToolbar />
          </div>
        )}

        <header className="text-center mb-12 sm:mb-16">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-4 tracking-tight">
            ECHO
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground font-medium">
            Mutual Fund Portfolio Analyzer
          </p>
          <p className="text-sm sm:text-base text-muted-foreground mt-4 max-w-2xl mx-auto">
            Upload a CAS PDF or JSON file to analyze your portfolio.
          </p>
        </header>

        <div
          className={`grid gap-6 ${
            user ? "mx-auto max-w-3xl" : "lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start"
          }`}
        >
          {!user && <AuthPanel />}

          <section aria-disabled={isLocked}>
            <div
              className={`relative border-2 border-dashed rounded-none p-12 sm:p-16 mb-8 bg-card transition-all duration-200 ${
                isLocked
                  ? "cursor-not-allowed border-border opacity-75"
                  : isDragging
                    ? "cursor-pointer border-primary bg-primary/5 scale-[1.01]"
                    : "cursor-pointer border-border hover:border-primary/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (!isLocked) {
                  fileInputRef.current?.click()
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.json"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isLocked || loading}
              />

              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <div className="mb-6">
                  {isLocked ? (
                    <Lock className="w-16 h-16 text-muted-foreground" />
                  ) : (
                    <Upload className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>
                <p className="text-lg sm:text-xl font-medium text-foreground mb-2">
                  {isLocked ? "Sign in to unlock CAS analysis" : "Upload CAS PDF or JSON to view insights"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {isLocked ? "Create an account or sign in before selecting a report." : "or drag and drop"}
                </p>
                {!isLocked && selectedFile && (
                  <p className="text-sm text-primary font-semibold mt-4">
                    Selected: {selectedFile.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">(Max. File size: 25 MB)</p>
              </div>
            </div>

            {!isLocked && selectedFile && selectedFile.name.toLowerCase().endsWith(".pdf") && (
              <div className="mb-6">
                <Input
                  type="password"
                  placeholder="Enter PDF password if needed (usually your PAN)"
                  className="w-full rounded-none border-border bg-card"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Leave blank if your PDF is not password-protected.
                </p>
              </div>
            )}

            {loading && progress > 0 && (
              <div className="mb-8">
                <div className="w-full h-1 bg-muted rounded-none overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {analysisComplete && analysisResult ? (
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px] px-8 rounded-none flex items-center gap-2 transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                >
                  View Portfolio
                  <ArrowRight className="w-5 h-5" />
                </Button>
              ) : (
                <Button
                  onClick={handleAnalyze}
                  disabled={loading || !selectedFile || isLocked}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px] px-8 rounded-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                >
                  {isLocked ? "Sign in to analyze" : loading ? "Processing..." : "Analyze Portfolio"}
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
