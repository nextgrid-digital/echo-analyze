import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Activity, Clock3, RefreshCw, ShieldCheck, Users } from "lucide-react"

import { fetchAdminMetrics } from "@/api/admin"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth"
import type { AdminMetricsResponse } from "@/types/admin"

function shortId(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

function formatDate(value: string | null) {
  if (!value) {
    return "N/A"
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatDuration(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "N/A"
  }

  if (value < 1000) {
    return `${Math.round(value)} ms`
  }

  return `${(value / 1000).toFixed(1)} s`
}

export function AdminPage() {
  const { session } = useAuth()
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMetrics = async (accessToken: string) => {
    const result = await fetchAdminMetrics(accessToken)
    setMetrics(result)
  }

  useEffect(() => {
    const accessToken = session?.access_token
    if (!accessToken) {
      return
    }

    let cancelled = false

    void (async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await fetchAdminMetrics(accessToken)
        if (!cancelled) {
          setMetrics(result)
        }
      } catch (metricsError) {
        if (!cancelled) {
          setError(metricsError instanceof Error ? metricsError.message : "Unable to load dashboard data.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [session?.access_token])

  const handleRefresh = async () => {
    if (!session?.access_token) {
      setError("Your session is no longer available.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await loadMetrics(session.access_token)
    } catch (metricsError) {
      setError(metricsError instanceof Error ? metricsError.message : "Unable to load dashboard data.")
    } finally {
      setLoading(false)
    }
  }

  const summaryCards = metrics
    ? [
        {
          label: "Users",
          value: metrics.summary.total_users.toLocaleString(),
          hint: `${metrics.summary.admin_users} admin`,
          icon: Users,
        },
        {
          label: "Active 30d",
          value: metrics.summary.active_users_30d.toLocaleString(),
          hint: `${metrics.summary.total_sign_ins_30d} sign-ins`,
          icon: Activity,
        },
        {
          label: "Report Runs",
          value: metrics.summary.total_analysis_runs.toLocaleString(),
          hint: `${metrics.summary.successful_analysis_runs} success / ${metrics.summary.failed_analysis_runs} failed`,
          icon: ShieldCheck,
        },
        {
          label: "Average Run Time",
          value: formatDuration(metrics.summary.average_duration_ms),
          hint: `p50 ${formatDuration(metrics.summary.p50_duration_ms)} | p95 ${formatDuration(metrics.summary.p95_duration_ms)}`,
          icon: Clock3,
        },
      ]
    : []

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">ECHO Admin</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Operations dashboard</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Operational access and report-generation metrics, without storing CAS files or report payloads.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => void handleRefresh()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild type="button" variant="outline">
              <Link to="/">Back to app</Link>
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.label} className="border-border/70">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardDescription>{card.label}</CardDescription>
                  <CardTitle className="mt-3 text-3xl">{card.value}</CardTitle>
                </div>
                <card.icon className="mt-1 h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{card.hint}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>User activity</CardTitle>
              <CardDescription>Per-user usage and recent report-generation history.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead>Avg Time</TableHead>
                    <TableHead>Last Sign-In</TableHead>
                    <TableHead>Last Run</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics?.user_metrics.map((row) => (
                    <TableRow key={row.user_id}>
                      <TableCell className="font-mono text-xs">{shortId(row.user_id)}</TableCell>
                      <TableCell className="uppercase text-xs tracking-[0.2em]">{row.role}</TableCell>
                      <TableCell>{row.analysis_runs}</TableCell>
                      <TableCell>{formatDuration(row.average_duration_ms)}</TableCell>
                      <TableCell>{formatDate(row.last_sign_in_at)}</TableCell>
                      <TableCell>{formatDate(row.last_run_at)}</TableCell>
                    </TableRow>
                  ))}
                  {!loading && metrics?.user_metrics.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Recent runs</CardTitle>
                <CardDescription>Latest report generation activity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics?.recent_runs.map((run) => (
                  <div key={run.id} className="border border-border/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-xs">{shortId(run.user_id)}</p>
                      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {run.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">
                      {run.file_kind?.toUpperCase() ?? "UNKNOWN"} | {formatDuration(run.duration_ms)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(run.created_at)}
                      {run.error_code ? ` | ${run.error_code}` : ""}
                    </p>
                  </div>
                ))}
                {!loading && metrics?.recent_runs.length === 0 && (
                  <p className="text-sm text-muted-foreground">No report activity yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>User logs</CardTitle>
                <CardDescription>Recent sign-up and sign-in activity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics?.recent_events.map((event) => (
                  <div key={event.id} className="border border-border/60 p-4">
                    <p className="font-mono text-xs">{shortId(event.user_id)}</p>
                    <p className="mt-2 text-sm uppercase tracking-[0.2em]">{event.event_type.replace("_", " ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(event.created_at)}</p>
                  </div>
                ))}
                {!loading && metrics?.recent_events.length === 0 && (
                  <p className="text-sm text-muted-foreground">No user activity yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
