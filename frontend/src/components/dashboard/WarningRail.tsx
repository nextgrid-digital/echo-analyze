import { memo, useMemo } from "react"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { AnalysisWarning } from "@/types/api"

interface WarningRailProps {
  warnings: AnalysisWarning[]
  className?: string
}

const SECTION_LABELS: Array<{ key: string; label: string }> = [
  { key: "valuation", label: "Valuation" },
  { key: "overlap", label: "Overlap" },
  { key: "performance", label: "Performance" },
  { key: "fixed_income", label: "Fixed Income" },
  { key: "risk", label: "Risk" },
  { key: "cost", label: "Cost" },
  { key: "tax", label: "Tax" },
  { key: "guidelines", label: "Guidelines" },
  { key: "benchmark", label: "Benchmark" },
  { key: "classification", label: "Classification" },
]

const severityVariant: Record<string, "default" | "destructive"> = {
  error: "destructive",
  warn: "default",
  info: "default",
}

const fallbackSectionLabel = (section: string): string =>
  section
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())

const normalizeSchemes = (schemes: string[] | undefined): string[] => {
  if (!schemes || schemes.length === 0) return []
  const normalized: string[] = []
  const seen = new Set<string>()
  for (const scheme of schemes) {
    const value = (scheme || "").trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(value)
  }
  return normalized
}

function WarningRailInner({ warnings, className }: WarningRailProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, AnalysisWarning[]>()
    for (const item of warnings) {
      const key = item.section || "other"
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return map
  }, [warnings])

  const orderedSections = useMemo(() => {
    const knownSections = SECTION_LABELS.filter(({ key }) => grouped.has(key))
    const knownKeys = new Set(knownSections.map(({ key }) => key))
    const unknownSections = Array.from(grouped.keys())
      .filter((key) => !knownKeys.has(key))
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({ key, label: fallbackSectionLabel(key) }))
    return [...knownSections, ...unknownSections]
  }, [grouped])

  if (!warnings.length) return null

  return (
    <Card className={cn("gap-4 py-4", className)}>
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm">Data Quality & Methodology Notices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        {orderedSections.map(({ key, label }) => {
          const items = grouped.get(key)
          if (!items?.length) return null
          return (
            <div key={key}>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <div className="space-y-1">
                {items.map((item, index) => {
                  const affectedSchemes = normalizeSchemes(item.affected_schemes)
                  const visibleSchemes = affectedSchemes.slice(0, 12)
                  const extraSchemeCount = Math.max(0, affectedSchemes.length - visibleSchemes.length)
                  return (
                    <Alert
                      key={`${item.code}-${index}`}
                      variant={severityVariant[item.severity] ?? "default"}
                      className="px-3 py-2"
                    >
                      <div className="flex items-start gap-2">
                        <AlertDescription className="flex-1 text-xs leading-relaxed">
                          {item.message}
                        </AlertDescription>
                        {affectedSchemes.length > 0 && (
                          <SectionInfoTooltip
                            title={`Affected funds (${affectedSchemes.length})`}
                            side="left"
                            content={
                              <div className="max-h-56 space-y-1 overflow-y-auto">
                                {visibleSchemes.map((schemeName) => (
                                  <p key={schemeName} className="text-[11px] leading-tight break-words">
                                    {schemeName}
                                  </p>
                                ))}
                                {extraSchemeCount > 0 && (
                                  <p className="text-[11px] opacity-80">
                                    + {extraSchemeCount} more
                                  </p>
                                )}
                              </div>
                            }
                          />
                        )}
                      </div>
                    </Alert>
                  )
                })}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export const WarningRail = memo(WarningRailInner)
