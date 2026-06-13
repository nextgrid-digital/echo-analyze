import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteClient } from "@/lib/opportunities/advisorBookStore"

export interface DeleteClientTarget {
  pan: string
  name: string
}

interface DeleteClientDialogProps {
  client: DeleteClientTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: (pan: string) => void
}

export function DeleteClientDialog({
  client,
  open,
  onOpenChange,
  onDeleted,
}: DeleteClientDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!client) return
    setIsDeleting(true)
    try {
      const deleted = await deleteClient(client.pan)
      if (deleted) {
        onDeleted?.(client.pan)
        onOpenChange(false)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete client?</DialogTitle>
          <DialogDescription>
            This removes <span className="font-medium text-foreground">{client?.name}</span> and their
            stored portfolio analysis from your account. Advisor notes for this client are also deleted.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || !client}>
            {isDeleting ? "Deleting..." : "Delete client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
