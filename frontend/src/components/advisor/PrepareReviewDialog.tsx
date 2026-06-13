import { useState } from "react"
import { ClipboardList } from "lucide-react"
import { prepareReview } from "@/api/reviews"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { MeetingBrief } from "@/types/review"
import { toast } from "sonner"

interface PrepareReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientPan: string
  clientName: string
}

function BriefSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="rounded-md border px-3 py-2 text-foreground">{item}</li>
        ))}
      </ul>
    </div>
  )
}

export function PrepareReviewDialog({
  open,
  onOpenChange,
  clientPan,
  clientName,
}: PrepareReviewDialogProps) {
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState<MeetingBrief | null>(null)

  const handlePrepare = async () => {
    setLoading(true)
    try {
      const result = await prepareReview(clientPan)
      setBrief(result.brief)
      toast.success("Meeting brief ready.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare review.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Prepare Review</DialogTitle>
          <DialogDescription>
            Generate a meeting brief for {clientName}.
          </DialogDescription>
        </DialogHeader>

        {!brief ? (
          <Button onClick={handlePrepare} disabled={loading} className="w-full">
            <ClipboardList className="mr-2 h-4 w-4" />
            {loading ? "Preparing…" : "Generate Meeting Brief"}
          </Button>
        ) : (
          <div className="space-y-5">
            <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">{brief.client_summary}</p>
            <BriefSection title="Key Strengths" items={brief.key_strengths} />
            <BriefSection title="Key Concerns" items={brief.key_concerns} />
            <BriefSection title="Discussion Topics" items={brief.discussion_topics} />
            <BriefSection title="Questions To Ask" items={brief.questions_to_ask} />
            <BriefSection title="Follow Up Actions" items={brief.follow_up_actions} />
            <Tabs defaultValue="whatsapp">
              <TabsList>
                <TabsTrigger value="whatsapp">WhatsApp Draft</TabsTrigger>
                <TabsTrigger value="email">Email Draft</TabsTrigger>
              </TabsList>
              <TabsContent value="whatsapp">
                <pre className="whitespace-pre-wrap rounded-lg border p-3 text-sm">{brief.whatsapp_draft}</pre>
              </TabsContent>
              <TabsContent value="email">
                <pre className="whitespace-pre-wrap rounded-lg border p-3 text-sm">{brief.email_draft}</pre>
              </TabsContent>
            </Tabs>
            <Button variant="outline" onClick={handlePrepare} disabled={loading}>
              Regenerate Brief
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
