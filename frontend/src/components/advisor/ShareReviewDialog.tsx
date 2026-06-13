import { useState } from "react"
import { Copy, Link2, Mail, MessageCircle } from "lucide-react"
import { buildReviewUrl, disableReviewLink, shareReview } from "@/api/reviews"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface ShareReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientPan: string
  clientName: string
}

export function ShareReviewDialog({
  open,
  onOpenChange,
  clientPan,
  clientName,
}: ShareReviewDialogProps) {
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [linkId, setLinkId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const result = await shareReview(clientPan)
      setShareUrl(buildReviewUrl(result.share_id))
      setLinkId(result.link_id)
      setExpiresAt(result.expires_at)
      toast.success("Review link created.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create review link.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    toast.success("Link copied.")
  }

  const handleWhatsApp = () => {
    if (!shareUrl) return
    const text = encodeURIComponent(
      `Hi ${clientName.split(" ")[0] || "there"}, your portfolio review is ready: ${shareUrl}`,
    )
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer")
  }

  const handleEmail = () => {
    if (!shareUrl) return
    const subject = encodeURIComponent(`${clientName} — Portfolio Review`)
    const body = encodeURIComponent(
      `Hi ${clientName},\n\nYour portfolio review is ready to view:\n${shareUrl}\n\nBest regards`,
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const handleDisable = async () => {
    if (!linkId) return
    try {
      await disableReviewLink(linkId)
      toast.success("Review link disabled.")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disable link.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Review</DialogTitle>
          <DialogDescription>
            Create a secure client-facing review link for {clientName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!shareUrl ? (
            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              <Link2 className="mr-2 h-4 w-4" />
              {loading ? "Generating…" : "Generate Share Link"}
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                <Input readOnly value={shareUrl} />
                {expiresAt ? (
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(expiresAt).toLocaleDateString("en-IN")}
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
                <Button variant="outline" onClick={handleWhatsApp}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
                <Button variant="outline" onClick={handleEmail}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
                <Button variant="destructive" onClick={handleDisable}>
                  Disable Link
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
