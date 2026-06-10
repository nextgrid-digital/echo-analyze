import { useState, type FormEvent } from "react"
import { submitDemoRequest, type ClientsManagedBand } from "@/api/demo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const CLIENT_BANDS: { value: ClientsManagedBand; label: string }[] = [
  { value: "under-50", label: "Fewer than 50" },
  { value: "50-500", label: "50 – 500" },
  { value: "500-plus", label: "500+" },
]

export function DemoRequestForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [firmName, setFirmName] = useState("")
  const [clientsManaged, setClientsManaged] = useState<ClientsManagedBand | "">("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!clientsManaged) {
      setError("Select how many clients your firm manages.")
      return
    }

    setLoading(true)
    try {
      await submitDemoRequest({
        name: name.trim(),
        email: email.trim(),
        firm_name: firmName.trim(),
        clients_managed: clientsManaged,
        message: message.trim() || undefined,
      })
      setSubmitted(true)
      toast.success("Demo request received. We'll be in touch shortly.")
      setName("")
      setEmail("")
      setFirmName("")
      setClientsManaged("")
      setMessage("")
    } catch (nextError) {
      const messageText =
        nextError instanceof Error ? nextError.message : "Unable to submit demo request."
      setError(messageText)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Alert>
        <AlertDescription>
          Thanks for reaching out. Our team will contact you at the email you provided.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="demo-name">Name</Label>
        <Input
          id="demo-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoComplete="name"
          placeholder="Your name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="demo-email">Work email</Label>
        <Input
          id="demo-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          placeholder="you@firm.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="demo-firm">Firm name</Label>
        <Input
          id="demo-firm"
          value={firmName}
          onChange={(event) => setFirmName(event.target.value)}
          required
          autoComplete="organization"
          placeholder="Your firm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="demo-clients">Clients managed</Label>
        <select
          id="demo-clients"
          value={clientsManaged}
          onChange={(event) => setClientsManaged(event.target.value as ClientsManagedBand)}
          required
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          )}
        >
          <option value="" disabled>
            Select a range
          </option>
          {CLIENT_BANDS.map((band) => (
            <option key={band.value} value={band.value}>
              {band.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="demo-message">
          Message <span className="text-muted-foreground">(optional)</span>
        </Label>
        <textarea
          id="demo-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          placeholder="Tell us about your practice"
        />
      </div>

      <Button type="submit" className="min-h-11 w-full" disabled={loading}>
        {loading ? "Submitting..." : "Request demo"}
      </Button>
    </form>
  )
}
