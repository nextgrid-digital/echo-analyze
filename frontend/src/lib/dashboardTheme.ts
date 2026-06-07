import { cn } from "@/lib/utils"

export type DashboardAccent =
  | "emerald"
  | "sky"
  | "violet"
  | "amber"
  | "rose"
  | "indigo"
  | "cyan"
  | "fuchsia"

const BRAND_ACCENT = {
  cardGradient: "from-white via-white to-slate-50/80",
  cardShadow: "shadow-slate-900/5",
  topGradient: "from-teal-600 to-teal-500",
  surface: "bg-white/95",
  icon: "rounded-lg bg-teal-600 text-white shadow-sm",
  label: "text-slate-600",
  sectionGradient: "from-teal-600 to-teal-500",
  sectionBadge: "bg-slate-900 text-teal-300 ring-1 ring-teal-500/30",
  sectionGlow: "bg-teal-500/10",
  panelTint: "from-white via-slate-50/50 to-white",
} as const

export const DASHBOARD_ACCENT_STYLES: Record<
  DashboardAccent,
  {
    cardGradient: string
    cardShadow: string
    topGradient: string
    surface: string
    icon: string
    label: string
    sectionGradient: string
    sectionBadge: string
    sectionGlow: string
    panelTint: string
  }
> = {
  emerald: BRAND_ACCENT,
  sky: BRAND_ACCENT,
  violet: BRAND_ACCENT,
  amber: BRAND_ACCENT,
  rose: BRAND_ACCENT,
  indigo: BRAND_ACCENT,
  cyan: BRAND_ACCENT,
  fuchsia: BRAND_ACCENT,
}

export const INSIGHT_TYPE_STYLES = {
  success: {
    surface:
      "border-emerald-200/80 bg-emerald-50/60 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-950/30",
    icon: "text-emerald-600 dark:text-emerald-400",
    label: "text-emerald-800 dark:text-emerald-200",
  },
  warning: {
    surface:
      "border-slate-200/80 bg-slate-50/80 shadow-sm dark:border-slate-700 dark:bg-slate-800/50",
    icon: "text-amber-600 dark:text-amber-400",
    label: "text-slate-800 dark:text-slate-200",
  },
  info: {
    surface:
      "border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700 dark:bg-slate-900/60",
    icon: "text-teal-600 dark:text-teal-400",
    label: "text-slate-700 dark:text-slate-300",
  },
} as const

export function getSectionPanelClass() {
  return cn(
    "dashboard-section-panel border-slate-200/70 bg-white/90 dark:border-slate-700/80 dark:bg-slate-900/80"
  )
}
