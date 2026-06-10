import { useState } from "react"
import { Link } from "react-router-dom"
import { Trash2 } from "lucide-react"
import { DeleteClientDialog } from "@/components/advisor/DeleteClientDialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AdvisorBookClient } from "@/lib/opportunities/types"

function formatAum(value: number) {
  if (value >= 100_000) {
    return `₹${(value / 100_000).toFixed(2)} Cr`
  }
  return `₹${value.toLocaleString("en-IN")}`
}

interface ClientBookTableProps {
  clients: AdvisorBookClient[]
  onClientClick: (pan: string) => void
  onClientDeleted?: (pan: string) => void
  uploadHref?: string
  title?: string
  description?: string
  emptyMessage?: string
}

export function ClientBookTable({
  clients,
  onClientClick,
  onClientDeleted,
  uploadHref = "/upload",
  title = "Uploaded CAS reports",
  description = "Clients added from analyzed CAS PDF or JSON files",
  emptyMessage = "No CAS reports yet. Upload your first report above.",
}: ClientBookTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<AdvisorBookClient | null>(null)

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to={uploadHref}>Upload CAS</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>
            {description} ({clients.length} {clients.length === 1 ? "client" : "clients"})
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <div className="overflow-x-auto rounded-b-lg border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>PAN</TableHead>
                  <TableHead className="text-right">AUM</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="w-[52px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client.pan}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onClientClick(client.pan)}
                  >
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="font-mono text-sm">{client.pan}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAum(client.analysis.summary?.total_market_value ?? 0)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(client.updatedAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${client.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setDeleteTarget(client)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DeleteClientDialog
        client={deleteTarget ? { pan: deleteTarget.pan, name: deleteTarget.name } : null}
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onDeleted={(pan) => {
          setDeleteTarget(null)
          onClientDeleted?.(pan)
        }}
      />
    </>
  )
}
