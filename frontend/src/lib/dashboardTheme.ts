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
  cardGradient: "from-card via-card to-muted/40",
  cardShadow: "shadow-sm",
  topGradient: "from-primary to-primary/80",
  surface: "bg-card/95",
  icon: "rounded-lg bg-primary text-primary-foreground shadow-sm",
  label: "text-muted-foreground",
  sectionGradient: "from-primary to-primary/80",
  sectionBadge: "bg-foreground text-primary ring-1 ring-primary/30",
  sectionGlow: "bg-primary/10",
  panelTint: "from-card via-muted/30 to-card",
} as const

export const DASHBOARD_ACCENT_STYLES: Record<
  DashboardAccent,
  typeof BRAND_ACCENT
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
      "border-border bg-muted/60 shadow-sm dark:bg-muted/40",
    icon: "text-amber-600 dark:text-amber-400",
    label: "text-foreground",
  },
  info: {
    surface:
      "border-border bg-card/90 shadow-sm dark:bg-card/60",
    icon: "text-primary",
    label: "text-muted-foreground",
  },
} as const

export function getSectionPanelClass(_accent: DashboardAccent) {
  return cn(
    "dashboard-section-panel border-border/70 bg-card/90 dark:bg-card/80"
  )
}
