import { memo, useMemo } from "react"
import { SectionInfoTooltip } from "@/components/SectionInfoTooltip"
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
  { key: "tax", label: "Tax" },
  { key: "guidelines", label: "Guidelines" },
  { key: "benchmark", label: "Benchmark" },
  { key: "classification", label: "Classification" },
]

const severityClasses: Record<string, string> = {
  error: "border-red-300 bg-red-50 text-red-900",
  warn: "border-amber-300 bg-amber-50 text-amber-900",
  info: "border-blue-300 bg-blue-50 text-blue-900",
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
    <div className={cn("border border-border bg-muted/30 p-4", className)}>
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Data Quality & Methodology Notices
      </h3>
      <div className="space-y-3">
        {orderedSections.map(({ key, label }) => {
          const items = grouped.get(key)
          if (!items?.length) return null
          return (
            <div key={key}>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {label}
              </p>
              <div className="space-y-1">
                {items.map((item, index) => {
                  const affectedSchemes = normalizeSchemes(item.affected_schemes)
                  const visibleSchemes = affectedSchemes.slice(0, 12)
                  const extraSchemeCount = Math.max(0, affectedSchemes.length - visibleSchemes.length)
                  return (
                    <div
                      key={`${item.code}-${index}`}
                      className={`border px-2 py-1 text-xs ${
                        severityClasses[item.severity] ?? severityClasses.info
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <p className="flex-1 leading-relaxed">{item.message}</p>
                        {affectedSchemes.length > 0 && (
                          <SectionInfoTooltip
                            title={`Affected funds (${affectedSchemes.length})`}
                            side="left"
                            content={
                              <div className="max-h-56 overflow-y-auto space-y-1">
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
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const WarningRail = memo(WarningRailInner)
