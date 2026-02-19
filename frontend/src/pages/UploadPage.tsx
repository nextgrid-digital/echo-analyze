import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { analyzePortfolio } from "@/api/analyze"
import type { AnalysisResponse } from "@/types/api"
import { Upload, ArrowRight } from "lucide-react"

export function UploadPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get user name (could be from context or props in the future)
  const userName = "Anindya"

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
    if (!selectedFile) {
      setError("Please select a CAS PDF or JSON file.")
      return
    }
    const isPdf = selectedFile.name.toLowerCase().endsWith(".pdf")
    if (isPdf && !password.trim()) {
      setError("Password is required for PDF files. CAS PDFs are usually protected with your PAN (e.g. ABCDE1234F).")
      return
    }

    setError(null)
    setLoading(true)
    setProgress(1)
    setAnalysisComplete(false)

    // Simulate progress during API call
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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-2xl">
        {/* Header/Branding Section */}
        <header className="text-center mb-12 sm:mb-16">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-4 tracking-tight">
            ECHO
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground font-medium">
            Mutual Fund Portfolio Analyzer
          </p>
        </header>

        {/* Upload Area */}
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
            <p className="text-sm text-muted-foreground mb-4">
              or drag and drop
            </p>
            {selectedFile && (
              <p className="text-sm text-primary font-semibold mt-4">
                Selected: {selectedFile.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              (Max. File size: 25 MB)
            </p>
          </div>
        </div>

        {/* Password Input */}
        {selectedFile && selectedFile.name.toLowerCase().endsWith(".pdf") && (
          <div className="mb-6">
            <Input
              type="password"
              placeholder="Enter PDF password (usually your PAN)"
              className="w-full rounded-none border-border bg-card"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}

        {/* Progress Bar */}
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

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {analysisComplete && analysisResult ? (
            <Button
              onClick={() => navigate("/dashboard", { state: { result: analysisResult } })}
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
      </div>
    </div>
  )
}
