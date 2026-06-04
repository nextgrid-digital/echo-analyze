import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getAdminOverview } from "@/api/admin"
import { AdminAccessToolbar } from "@/components/AdminAccessToolbar"
import { Badge } from "@/components/ui/badge"
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
import type {
  AdminAnalysisRun,
  AdminAnalyticsMetrics,
  AdminLogEntry,
  AdminLogWindow,
  AdminOverviewResponse,
  AdminTopUser,
} from "@/types/admin"

function formatDuration(durationMs?: number | null) {
  if (durationMs == null) {
    return "N/A"
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`
  }

  return `${(durationMs / 1000).toFixed(2)} s`
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "N/A"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

function getStatusVariant(status: string): "default" | "destructive" | "outline" {
  if (status === "success") {
    return "default"
  }
  if (status.includes("error")) {
    return "destructive"
  }
  return "outline"
}

function MetricCard({
  label,
  value,
  caption,
}: {
  label: string
  value: string
  caption: string
}) {
  return (
    <Card className="gap-3">
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tracking-tight">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">
        {caption}
      </CardContent>
    </Card>
  )
}

function RecentAnalysesTable({ rows }: { rows: AdminAnalysisRun[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Holdings</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.request_id}>
            <TableCell>{formatTimestamp(row.created_at)}</TableCell>
            <TableCell>{row.username}</TableCell>
            <TableCell>{row.file_type?.toUpperCase() ?? "N/A"}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
            </TableCell>
            <TableCell>{formatDuration(row.duration_ms)}</TableCell>
            <TableCell>{row.holdings_count ?? "N/A"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ActivityLogTable({ rows }: { rows: AdminLogEntry[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Message</TableHead>
          <TableHead>Route</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={`${row.created_at}-${row.action}-${index}`}>
            <TableCell>{formatTimestamp(row.created_at)}</TableCell>
            <TableCell>{row.username ?? "Unknown user"}</TableCell>
            <TableCell>{row.action}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
            </TableCell>
            <TableCell className="max-w-[420px] whitespace-normal">{row.message}</TableCell>
            <TableCell>{row.route}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function TopUsersTable({ rows }: { rows: AdminTopUser[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Reports analyzed</TableHead>
          <TableHead>Last analysis</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.username}>
            <TableCell>{row.username}</TableCell>
            <TableCell>{row.report_count}</TableCell>
            <TableCell>{formatTimestamp(row.last_analysis_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function buildMetricCards(metrics: AdminAnalyticsMetrics) {
  return [
    {
      label: "Total users",
      value: String(metrics.total_users ?? metrics.registered_users ?? metrics.tracked_users),
      caption: "Supabase users if available, otherwise tracked analysts.",
    },
    {
      label: "Active users",
      value: String(metrics.active_users),
      caption: `${metrics.active_users_7d} active in the last 7 days.`,
    },
    {
      label: "Analysis runs",
      value: String(metrics.total_analyses),
      caption: `${metrics.successful_analyses} successful and ${metrics.failed_analyses} failed.`,
    },
    {
      label: "Average runtime",
      value: formatDuration(metrics.average_duration_ms),
      caption: `Fastest ${formatDuration(metrics.fastest_duration_ms)}. Slowest ${formatDuration(metrics.slowest_duration_ms)}.`,
    },
  ]
}

export function AdminPage() {
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null)
  const [logWindow, setLogWindow] = useState<AdminLogWindow>("24h")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadOverview() {
      setLoading(true)
      try {
        const nextOverview = await getAdminOverview(logWindow)
        if (!isCancelled) {
          setOverview(nextOverview)
          setError(null)
        }
      } catch (nextError) {
        if (!isCancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load admin overview.")
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    void loadOverview()

    return () => {
      isCancelled = true
    }
  }, [logWindow])

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        Loading admin overview...
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
              <h1 className="text-3xl font-semibold tracking-tight">Analytics overview</h1>
            </div>
            <AdminAccessToolbar />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Could not load admin data</CardTitle>
              <CardDescription>
                {error ?? "The backend did not return an admin overview."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button asChild variant="outline">
                <Link to="/">Back to analyzer</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const metricCards = buildMetricCards(overview.metrics)

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
            <h1 className="text-4xl font-semibold tracking-tight">Portfolio analytics console</h1>
            <p className="text-muted-foreground max-w-2xl">
              Review run timings, tracked user activity, and recent backend events from the
              portfolio analyzer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/">Back to analyzer</Link>
            </Button>
            <AdminAccessToolbar />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              caption={metric.caption}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top users</CardTitle>
            <CardDescription>
              Users with the highest number of analyzed reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.top_users.length > 0 ? (
              <TopUsersTable rows={overview.top_users} />
            ) : (
              <p className="text-sm text-muted-foreground">No report activity has been recorded yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent analysis runs</CardTitle>
            <CardDescription>
              Latest portfolio analysis requests. CAS files and filenames are not stored.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.recent_analyses.length > 0 ? (
              <RecentAnalysesTable rows={overview.recent_analyses} />
            ) : (
              <p className="text-sm text-muted-foreground">No analysis runs have been recorded yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Recent activity log</CardTitle>
                <CardDescription>
                  Analysis and admin events captured by the application.
                </CardDescription>
              </div>
              <select
                className="h-9 rounded-none border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={logWindow}
                onChange={(event) => setLogWindow(event.target.value as AdminLogWindow)}
                aria-label="Activity log window"
              >
                <option value="24h">Recent 24 hours</option>
                <option value="7d">Recent 7 days</option>
                <option value="30d">Recent 1 month</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {overview.recent_logs.length > 0 ? (
              <ActivityLogTable rows={overview.recent_logs} />
            ) : (
              <p className="text-sm text-muted-foreground">No activity logs are available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
