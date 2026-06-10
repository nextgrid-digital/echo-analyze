import { Search } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { listClients } from "@/lib/opportunities/advisorBookStore"
import { setActiveClientPan } from "@/lib/activeClient"
import { useState } from "react"

export function SearchInput() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || !query.trim()) return
    const q = query.trim().toLowerCase()
    const match = listClients().find(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.pan.toLowerCase().includes(q)
    )
    if (match) {
      setActiveClientPan(match.pan)
      navigate(`/clients/${encodeURIComponent(match.pan)}`)
      setQuery("")
    }
  }

  return (
    <div className="relative hidden w-full max-w-sm md:block">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search clients..."
        className="h-9 w-full pl-8"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
