import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { analyzePortfolio } from "@/api/analyze"
import { AuthPanel } from "@/auth/AuthPage"
import { useAuth } from "@/auth/useAuth"
import { SiteHeader } from "@/components/SiteHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { storeLatestAnalysis } from "@/lib/analysisSession"
import type { AnalysisResponse } from "@/types/api"
import { ArrowRight, CreditCard, Lock, Upload } from "lucide-react"

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

export function UploadPage() {
  const navigate = useNavigate()
  const { user, billingAccess, refreshBillingAccess } = useAuth()
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
  const isBillingLoading = Boolean(user && !billingAccess)
  const isQuotaLocked = Boolean(user && billingAccess && !billingAccess.can_analyze)
  const isLocked = !user || isBillingLoading || isQuotaLocked

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
      if (!user) {
        setError("Sign in or create an account to analyze CAS reports.")
      } else if (isQuotaLocked) {
        setError("You have used your free CAS report. Subscribe for unlimited analysis.")
      } else {
        setError("Checking your report access. Please try again in a moment.")
      }
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
      void refreshBillingAccess()
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
    <div className="marketing-page min-h-screen text-foreground">
      <SiteHeader />
      <div className="px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-6xl mx-auto">
        <header className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 tracking-tight">
            Analyze your CAS
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Upload a CAS PDF or JSON file to generate your portfolio dashboard.
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
                    ? "cursor-pointer border-emerald-500 bg-emerald-50 scale-[1.01]"
                    : "cursor-pointer border-border hover:border-emerald-400/60 hover:bg-emerald-50/30"
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
                    isQuotaLocked ? (
                      <CreditCard className="w-16 h-16 text-muted-foreground" />
                    ) : (
                      <Lock className="w-16 h-16 text-muted-foreground" />
                    )
                  ) : (
                    <Upload className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>
                <p className="text-lg sm:text-xl font-medium text-foreground mb-2">
                  {!user
                    ? "Sign in to unlock CAS analysis"
                    : isQuotaLocked
                      ? "Free CAS report used"
                      : isBillingLoading
                        ? "Checking report access"
                        : "Upload CAS PDF or JSON to view insights"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {!user
                    ? "Create an account or sign in before selecting a report."
                    : isQuotaLocked
                      ? "Upgrade to unlock unlimited reports."
                      : isBillingLoading
                        ? "Your quota and subscription status are loading."
                        : "or drag and drop"}
                </p>
                {isQuotaLocked && (
                  <Button asChild variant="outline" className="mt-2">
                    <Link to="/pricing">View pricing</Link>
                  </Button>
                )}
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
              {user && billingAccess && !billingAccess.has_unlimited_reports && !isQuotaLocked && (
                <Button asChild variant="outline" className="min-h-[48px] px-8">
                  <Link to="/pricing">
                    <CreditCard className="w-5 h-5" />
                    Upgrade
                  </Link>
                </Button>
              )}
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
                  {!user
                    ? "Sign in to analyze"
                    : isQuotaLocked
                      ? "Subscribe to analyze"
                      : isBillingLoading
                        ? "Checking access..."
                        : loading
                          ? "Processing..."
                          : "Analyze Portfolio"}
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>
      </div>
    </div>
  )
}
