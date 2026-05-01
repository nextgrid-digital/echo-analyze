import { SignInButton, SignUpButton, useAuth } from "@clerk/react"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { analyzePortfolio } from "@/api/analyze"
import { AuthToolbar } from "@/components/auth/AuthToolbar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { clearLatestAnalysis, storeLatestAnalysis } from "@/lib/analysisSession"
import { useAuthConfig } from "@/lib/authConfig"
import type { AnalysisResponse } from "@/types/api"
import { ArrowRight, LockKeyhole, Upload } from "lucide-react"

const CLERK_LOAD_TIMEOUT_MS = 8000

export function UploadPage() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn, getToken, userId } = useAuth()
  const authConfig = useAuthConfig()
  const [password, setPassword] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authLoadTimedOut, setAuthLoadTimedOut] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || isSignedIn) {
      return
    }

    clearLatestAnalysis()
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    if (isLoaded) {
      return
    }

    const timeoutId = window.setTimeout(() => setAuthLoadTimedOut(true), CLERK_LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(timeoutId)
  }, [isLoaded])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.name.toLowerCase().endsWith(".pdf") || file.name.toLowerCase().endsWith(".json")) {
        setSelectedFile(file)
        setError(null)
      } else {
        setError("Please select a PDF or JSON file.")
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleAnalyze = async () => {
    if (!isSignedIn) {
      setError("Please sign in before analyzing a portfolio.")
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
      const result = await analyzePortfolio(selectedFile, password, getToken)

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
      storeLatestAnalysis(result, userId)
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
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-8 flex justify-end">
          <AuthToolbar />
        </div>

        <header className="text-center mb-12 sm:mb-16">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-4 tracking-tight">
            ECHO
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground font-medium">
            Mutual Fund Portfolio Analyzer
          </p>
          <p className="text-sm sm:text-base text-muted-foreground mt-4 max-w-2xl mx-auto">
            Sign in to upload portfolios, run analyses, and access the admin console if your
            account has permission.
          </p>
        </header>

        {!isLoaded ? (
          <div className="border border-border bg-card p-10 text-center space-y-3">
            <p className="text-muted-foreground">
              Loading Clerk authentication...
            </p>
            {authLoadTimedOut ? (
              <p className="text-sm text-destructive max-w-xl mx-auto leading-6">
                Clerk did not finish loading. Current key type:{" "}
                <code>{authConfig?.clerk_key_type ?? "unknown"}</code>
                {authConfig?.clerk_frontend_api ? (
                  <>
                    {" "}
                    for <code>{authConfig.clerk_frontend_api}</code>.
                  </>
                ) : (
                  "."
                )}{" "}
                For local development, use a Clerk test publishable key or make sure the Clerk
                frontend domain resolves from this machine.
              </p>
            ) : null}
          </div>
        ) : !isSignedIn ? (
          <div className="border border-border bg-card p-8 sm:p-12 text-center space-y-6">
            <div className="w-14 h-14 mx-auto rounded-full border border-border flex items-center justify-center">
              <LockKeyhole className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                Sign in to analyze a portfolio
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto leading-7">
                Authentication is required before you can upload CAS files and run portfolio
                analysis.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <SignUpButton mode="modal">
                <Button type="button" className="min-h-[48px] px-8">
                  Create account
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button type="button" variant="outline" className="min-h-[48px] px-8">
                  Sign in
                </Button>
              </SignInButton>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`relative border-2 border-dashed rounded-none p-12 sm:p-16 mb-8 bg-card transition-all duration-200 cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-primary/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.json"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-6">
                  <Upload className="w-16 h-16 text-muted-foreground" />
                </div>
                <p className="text-lg sm:text-xl font-medium text-foreground mb-2">
                  Upload CAS PDF or JSON to view insights
                </p>
                <p className="text-sm text-muted-foreground mb-4">or drag and drop</p>
                {selectedFile && (
                  <p className="text-sm text-primary font-semibold mt-4">
                    Selected: {selectedFile.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">(Max. File size: 25 MB)</p>
              </div>
            </div>

            {selectedFile && selectedFile.name.toLowerCase().endsWith(".pdf") && (
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
                  disabled={loading || !selectedFile}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px] px-8 rounded-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                >
                  {loading ? "Processing..." : "Analyze Portfolio"}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
