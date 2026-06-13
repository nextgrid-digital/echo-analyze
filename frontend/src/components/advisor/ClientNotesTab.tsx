import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { getClientNotes, setClientNotes } from "@/lib/clientNotes"

interface ClientNotesTabProps {
  clientPan?: string
}

function formatSavedAt(date: Date): string {
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ClientNotesTab({ clientPan }: ClientNotesTabProps) {
  const [notes, setNotes] = useState("")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!clientPan) {
      setNotes("")
      setLastSavedAt(null)
      setIsDirty(false)
      setSaveError(null)
      return
    }

    const stored = getClientNotes(clientPan)
    setNotes(stored)
    setLastSavedAt(stored ? new Date() : null)
    setIsDirty(false)
    setSaveError(null)
  }, [clientPan])

  const persistNotes = useCallback(
    async (value: string) => {
      if (!clientPan) return
      try {
        await setClientNotes(clientPan, value)
        setLastSavedAt(new Date())
        setIsDirty(false)
        setSaveError(null)
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Could not save notes. Try again later."
        )
      }
    },
    [clientPan]
  )

  const handleChange = (value: string) => {
    setNotes(value)
    setIsDirty(true)
    setSaveError(null)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      void persistNotes(value)
    }, 500)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handleSave = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    void persistNotes(notes)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Advisor Notes</CardTitle>
          <CardDescription>
            Private notes for this client meeting. Synced to your Echo account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={10}
            className="min-h-[200px] resize-y"
            placeholder={
              clientPan
                ? "Write meeting notes or follow-up actions..."
                : "Select a client to save notes"
            }
            value={notes}
            onChange={(event) => handleChange(event.target.value)}
            disabled={!clientPan}
          />
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {saveError
              ? saveError
              : isDirty
                ? "Saving..."
                : lastSavedAt
                  ? `Last saved ${formatSavedAt(lastSavedAt)}`
                  : "No notes saved yet"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!clientPan || !isDirty}
          >
            Save now
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
