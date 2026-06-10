import { CasUploadPanel } from "@/components/upload/CasUploadPanel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ClientCasUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientPan?: string
  clientName: string
  onSuccess: (pan: string) => void
}

export function ClientCasUploadDialog({
  open,
  onOpenChange,
  clientPan,
  clientName,
  onSuccess,
}: ClientCasUploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>Upload CAS for {clientName}</DialogTitle>
          <DialogDescription>
            Analyze a new statement to refresh holdings, performance, and risk metrics for this
            client.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 sm:p-6">
          {open ? (
            <CasUploadPanel
              key={`${clientPan ?? "client"}-upload`}
              embedded
              expectedPan={clientPan}
              showViewPortfolioButton={false}
              onAnalysisComplete={onSuccess}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
