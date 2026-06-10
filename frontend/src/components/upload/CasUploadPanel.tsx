import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { analyzePortfolio } from "@/api/analyze"
import { useAuth } from "@/auth/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { setActiveClientPan } from "@/lib/activeClient"
import { storeLatestAnalysis } from "@/lib/analysisSession"
import { upsertClientAnalysis } from "@/lib/opportunities/advisorBookStore"
import { cn } from "@/lib/utils"
import { ArrowRight, CheckCircle2, CreditCard, Lock, Upload, X } from "lucide-react"

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

type QueueItemStatus = "pending" | "processing" | "done" | "error"

interface UploadQueueItem {
  id: string
  file: File
  password: string
  status: QueueItemStatus
  error?: string
  pan?: string
  clientName?: string
}

function isQuotaExceededMessage(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes("free cas report") ||
    normalized.includes("subscribe for unlimited")
  )
}

function validateFile(file: File): string | null {
  const lowerName = file.name.toLowerCase()
  const isSupported = lowerName.endsWith(".pdf") || lowerName.endsWith(".json")
  if (!isSupported) {
    return `${file.name}: only PDF or JSON files are supported.`
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name}: file is too large (max 25 MB).`
  }
  return null
}

function createQueueItem(file: File): UploadQueueItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    password: "",
    status: "pending",
  }
}

function isPdfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".pdf")
}

interface CasUploadPanelProps {
  onAnalysisComplete?: (pan: string) => void
  onClientStored?: (pan: string) => void
  showViewPortfolioButton?: boolean
  embedded?: boolean
  expectedPan?: string
  className?: string
}

export function CasUploadPanel({
  onAnalysisComplete,
  onClientStored,
  showViewPortfolioButton = true,
  embedded = false,
  expectedPan,
  className,
}: CasUploadPanelProps) {
  const navigate = useNavigate()
  const {
    user,
    billingAccess,
    billingAccessLoading,
    billingAccessError,
    refreshBillingAccess,
  } = useAuth()
  const [queue, setQueue] = useState<UploadQueueItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [batchComplete, setBatchComplete] = useState(false)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isBillingLoading = Boolean(user && billingAccessLoading)
  const isQuotaLocked = Boolean(user && billingAccess && !billingAccess.can_analyze)
  const isLocked = isBillingLoading || isQuotaLocked

  const pendingItems = queue.filter((item) => item.status === "pending")
  const completedItems = queue.filter((item) => item.status === "done")
  const lastCompleted = completedItems[completedItems.length - 1]

  const clearProgressInterval = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }

  useEffect(() => {
    return () => clearProgressInterval()
  }, [])

  useEffect(() => {
    if (embedded) return
    if (user && billingAccess && !billingAccess.can_analyze && queue.length === 0) {
      navigate("/pricing", { replace: true })
    }
  }, [user, billingAccess, navigate, queue.length, embedded])

  const addFiles = (files: FileList | File[]) => {
    const nextErrors: string[] = []
    const nextItems: UploadQueueItem[] = []

    Array.from(files).forEach((file) => {
      const validationError = validateFile(file)
      if (validationError) {
        nextErrors.push(validationError)
        return
      }
      nextItems.push(createQueueItem(file))
    })

    if (nextItems.length > 0) {
      setQueue((current) => [...current, ...nextItems])
      setBatchComplete(false)
      setError(null)
    }

    if (nextErrors.length > 0) {
      setError(nextErrors.join(" "))
    }
  }

  const updatePassword = (id: string, password: string) => {
    setQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, password } : item))
    )
  }

  const removeItem = (id: string) => {
    if (loading) return
    setQueue((current) => current.filter((item) => item.id !== id))
  }

  const resetUpload = () => {
    clearProgressInterval()
    setQueue([])
    setError(null)
    setProgress(0)
    setBatchComplete(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isLocked && !loading) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isLocked && !loading) setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (isLocked || loading) return
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked || loading) return
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
    }
    e.target.value = ""
  }

  const analyzeItem = async (item: UploadQueueItem): Promise<UploadQueueItem> => {
    const result = await analyzePortfolio(item.file, item.password)

    if (!result.success) {
      return {
        ...item,
        status: "error",
        error: result.error ?? "Analysis failed.",
      }
    }

    if (!result.summary) {
      return {
        ...item,
        status: "error",
        error: "Analysis returned no summary data.",
      }
    }

    storeLatestAnalysis(result)
    const client = upsertClientAnalysis(result)
    const pan = client?.pan ?? result.summary.investor_info?.pan?.trim() ?? undefined
    const clientName = client?.name ?? result.summary.investor_info?.name?.trim()

    if (pan) {
      setActiveClientPan(pan)
      onClientStored?.(pan)
    }

    return {
      ...item,
      status: "done",
      pan,
      clientName,
      error: undefined,
    }
  }

  const handleAnalyze = async () => {
    if (isLocked) {
      if (isQuotaLocked) {
        navigate("/pricing")
      } else {
        setError("Checking your report access. Please try again in a moment.")
      }
      return
    }

    if (pendingItems.length === 0) {
      setError("Add one or more CAS PDF or JSON files to analyze.")
      return
    }

    setError(null)
    setLoading(true)
    setBatchComplete(false)
    setProgress(1)

    let currentProgress = 1
    clearProgressInterval()
    progressIntervalRef.current = setInterval(() => {
      if (currentProgress < 95) {
        const increment = currentProgress < 50 ? 2 : currentProgress < 80 ? 1.5 : 0.8
        currentProgress = Math.min(currentProgress + increment, 95)
        setProgress(currentProgress)
      }
    }, 100)

    let quotaExceeded = false
    let lastSuccessPan: string | undefined

    for (const item of pendingItems) {
      setQueue((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: "processing", error: undefined } : entry
        )
      )

      try {
        const updated = await analyzeItem(item)
        setQueue((current) =>
          current.map((entry) => (entry.id === item.id ? updated : entry))
        )

        if (updated.status === "done") {
          lastSuccessPan = updated.pan
          void refreshBillingAccess()
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Connection error. Is the backend running?"

        if (isQuotaExceededMessage(message)) {
          quotaExceeded = true
          setQueue((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? { ...entry, status: "error", error: message }
                : entry
            )
          )
          break
        }

        setQueue((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, status: "error", error: message } : entry
          )
        )
      }
    }

    clearProgressInterval()
    setProgress(100)
    await new Promise((resolve) => setTimeout(resolve, 300))
    setProgress(0)
    setLoading(false)
    setBatchComplete(true)

    if (quotaExceeded) {
      if (!embedded) {
        navigate("/pricing")
      }
      return
    }

    if (embedded && lastSuccessPan) {
      if (expectedPan && lastSuccessPan !== expectedPan) {
        setError(
          `This CAS belongs to ${lastSuccessPan}, not ${expectedPan}. The client book was updated for the uploaded PAN.`
        )
      }
      onAnalysisComplete?.(lastSuccessPan)
    }
  }

  const analyzeButtonLabel = () => {
    if (isQuotaLocked) return "Subscribe to analyze"
    if (isBillingLoading) return "Checking access..."
    if (loading) return "Processing..."
    if (pendingItems.length > 1) return `Analyze all (${pendingItems.length})`
    return "Analyze CAS"
  }

  return (
    <section className={className} aria-disabled={isLocked}>
      <Card
        className={cn(
          "cursor-pointer border-2 border-dashed py-0 shadow-none transition-all duration-200",
          embedded ? "mb-4" : "mb-6",
          isLocked || loading
            ? "cursor-not-allowed opacity-75"
            : isDragging
              ? "scale-[1.01] border-primary bg-accent/50"
              : "hover:border-primary/60 hover:bg-accent/20"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!isLocked && !loading) {
            fileInputRef.current?.click()
          }
        }}
      >
        <CardContent
          className={cn(
            "flex flex-col items-center justify-center text-center",
            embedded ? "min-h-[140px] p-6 sm:p-8" : "min-h-[200px] p-10 sm:p-14"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.json"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={isLocked || loading}
          />

          <div className="mb-4">
            {isLocked ? (
              isQuotaLocked ? (
                <CreditCard className="h-14 w-14 text-muted-foreground" />
              ) : (
                <Lock className="h-14 w-14 text-muted-foreground" />
              )
            ) : (
              <Upload className="h-14 w-14 text-muted-foreground" />
            )}
          </div>
          <p className="mb-2 text-lg font-medium text-foreground">
            {isQuotaLocked
              ? "Free CAS report used"
              : isBillingLoading
                ? "Checking report access"
                : embedded
                  ? "Upload new CAS"
                  : "Add CAS reports"}
          </p>
          <p className="mb-2 text-sm text-muted-foreground">
            {isQuotaLocked
              ? "Upgrade to unlock unlimited reports."
              : isBillingLoading
                ? "Your quota and subscription status are loading."
                : embedded
                  ? "Drag and drop a CAMS/CAS PDF or JSON file, or click to browse"
                  : "Drag and drop multiple CAMS/CAS PDFs, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">
            {embedded
              ? "PDF password is usually the investor PAN (max 25 MB)"
              : "Each password-protected PDF gets its own password below (max 25 MB per file)"}
          </p>
          {isQuotaLocked && (
            <Button asChild variant="outline" className="mt-4">
              <Link to="/pricing">View pricing</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {billingAccessError && !isBillingLoading && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription className="space-y-3">
            <p>{billingAccessError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refreshBillingAccess()}
            >
              Retry loading access
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {queue.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm font-medium">
              Files to analyze ({queue.length})
            </Label>
            {!loading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLocked}
              >
                Add more files
              </Button>
            )}
          </div>

          {queue.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border bg-card p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                {!loading && item.status === "pending" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {item.status === "processing" && (
                  <span className="text-xs font-medium text-primary">Processing…</span>
                )}
                {item.status === "done" && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Done
                  </span>
                )}
              </div>

              {isPdfFile(item.file) && item.status === "pending" && (
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor={`pdf-password-${item.id}`} className="text-xs">
                    PDF password for this file
                  </Label>
                  <Input
                    id={`pdf-password-${item.id}`}
                    type="password"
                    placeholder="Usually the investor PAN for this CAS"
                    value={item.password}
                    onChange={(e) => updatePassword(item.id, e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              {item.status === "done" && item.clientName && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Added {item.clientName}
                  {item.pan ? ` (${item.pan})` : ""}
                </p>
              )}

              {item.status === "error" && item.error && (
                <p className="mt-2 text-xs text-destructive">{item.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && progress > 0 && <Progress value={progress} className="mb-6 w-full" />}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {batchComplete && completedItems.length > 0 && (
        <Alert className="mb-6">
          <AlertDescription>
            {completedItems.length === 1
              ? `Successfully analyzed ${completedItems[0]?.clientName ?? "client"}.`
              : `Successfully analyzed ${completedItems.length} of ${queue.length} reports.`}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col justify-center gap-4 sm:flex-row">
        {user && billingAccess && !billingAccess.has_unlimited_reports && !isQuotaLocked && (
          <Button asChild variant="outline" className="min-h-12 px-8">
            <Link to="/pricing">
              <CreditCard className="h-5 w-5" />
              Upgrade
            </Link>
          </Button>
        )}
        {batchComplete && completedItems.length > 0 && !embedded ? (
          <>
            {!embedded && (
              <Button
                onClick={resetUpload}
                variant="outline"
                size="lg"
                className="min-h-12 px-8"
              >
                Upload more
              </Button>
            )}
            {showViewPortfolioButton && !embedded && lastCompleted?.pan && completedItems.length === 1 && (
              <Button
                onClick={() => onAnalysisComplete?.(lastCompleted.pan!)}
                size="lg"
                className="min-h-12 gap-2 px-8"
              >
                View client workspace
                <ArrowRight className="h-5 w-5" />
              </Button>
            )}
          </>
        ) : (
          <Button
            onClick={handleAnalyze}
            disabled={loading || pendingItems.length === 0 || isLocked}
            size="lg"
            className="min-h-12 px-8"
          >
            {analyzeButtonLabel()}
          </Button>
        )}
      </div>
    </section>
  )
}
